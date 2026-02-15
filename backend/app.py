import asyncio
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Extra

from agents.graph import paper_graph

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

bucket = os.getenv("S3_BUCKET")
region = os.getenv("AWS_REGION")
knowledge_base_id = os.getenv("KNOWLEDGE_BASE_ID")
data_source_id = os.getenv("DATA_SOURCE_ID")
session_kwargs = {}
access_key = os.getenv("AWS_ACCESS_KEY_ID")
secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
session_token = os.getenv("AWS_SESSION_TOKEN")

if access_key and secret_key:
    session_kwargs = {
        "aws_access_key_id": access_key,
        "aws_secret_access_key": secret_key,
        "aws_session_token": session_token or None,
    }

aws_session = boto3.Session(**session_kwargs)
s3 = aws_session.client("s3", region_name=region)
app = FastAPI(title="PaperToPaper backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class IngestRequest(BaseModel):
    sessionId: str
    s3Key: Optional[str] = None
    fileName: Optional[str] = None
    s3Bucket: Optional[str] = None

    class Config:
        extra = Extra.allow


def _format_datetime(value: Optional[datetime]) -> Optional[str]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _get_bedrock_client():
    if not region:
        raise HTTPException(status_code=500, detail="AWS_REGION must be configured to start ingestion jobs.")
    return aws_session.client("bedrock-agent", region_name=region)


def _serialize_ingestion_job(job: dict) -> dict:
    return {
        "ingestionJobId": job.get("ingestionJobId"),
        "status": job.get("status"),
        "failureReasons": job.get("failureReasons", []),
        "startedAt": _format_datetime(job.get("startedAt")),
        "updatedAt": _format_datetime(job.get("updatedAt")),
    }


def _list_ingestion_jobs() -> List[dict]:
    client = _get_bedrock_client()
    response = client.list_ingestion_jobs(
        knowledgeBaseId=knowledge_base_id,
        dataSourceId=data_source_id,
        maxResults=5,
    )
    return response.get("ingestionJobs", [])


def _latest_ingestion_job() -> Optional[dict]:
    try:
        jobs = _list_ingestion_jobs()
    except ClientError:
        return None

    if not jobs:
        return None

    return max(
        jobs,
        key=lambda job: job.get("updatedAt") or job.get("startedAt") or datetime.min,
    )

def _unsafe_upload_configured() -> bool:
    return bool(bucket and region)


def _ensure_ingestion_configured():
    missing = []
    if not knowledge_base_id:
        missing.append("KNOWLEDGE_BASE_ID")
    if not data_source_id:
        missing.append("DATA_SOURCE_ID")
    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Missing ingestion configuration: set {', '.join(missing)}.",
        )


def _is_conflict_error(exc: ClientError) -> bool:
    error_info = exc.response.get("Error", {})
    code = error_info.get("Code", "")
    message = error_info.get("Message", "").lower()
    return code in {"ConflictException", "Conflict"} or "already running" in message


def _describe_ingestion_job(job_id: str) -> dict:
    client = _get_bedrock_client()
    response = client.get_ingestion_job(
        knowledgeBaseId=knowledge_base_id,
        dataSourceId=data_source_id,
        ingestionJobId=job_id,
    )
    return response.get("ingestionJob", {})


def _extract_job_id_from_response(response: dict) -> Optional[str]:
    if not response:
        return None

    candidates = [
        response.get("ingestionJobId"),
        response.get("jobId"),
        response.get("JobId"),
        response.get("ingestionJob", {}).get("ingestionJobId") if isinstance(response.get("ingestionJob"), dict) else None,
    ]

    for candidate in candidates:
        if candidate:
            return candidate

    return None


@app.post("/api/upload")
async def upload_paper(paper: UploadFile = File(...)) -> JSONResponse:
    if not _unsafe_upload_configured():
        raise HTTPException(status_code=500, detail="AWS_REGION and S3_BUCKET must be configured.")

    file_contents = await paper.read()
    if not file_contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    session_id = str(uuid.uuid4())
    safe_name = Path(paper.filename).name
    key = f"sessions/{session_id}/{safe_name}"

    try:
        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=file_contents,
            ContentType=paper.content_type or "application/pdf",
        )
    except (BotoCoreError, ClientError) as exc:
        raise HTTPException(status_code=500, detail="Unable to write to S3.") from exc

    response_payload = {
        "sessionId": session_id,
        "s3Bucket": bucket,
        "s3Key": key,
        "fileName": safe_name,
    }

    return JSONResponse(response_payload)


@app.post("/api/ingest")
async def trigger_ingestion(request: IngestRequest) -> JSONResponse:
    _ensure_ingestion_configured()
    client = _get_bedrock_client()
    description = f"Session upload {request.sessionId}"
    if request.fileName:
        description += f" ({request.fileName})"

    try:
        response = client.start_ingestion_job(
            knowledgeBaseId=knowledge_base_id,
            dataSourceId=data_source_id,
            description=description,
        )
        job_id = _extract_job_id_from_response(response)
        if not job_id:
            fallback_job = _latest_ingestion_job()
            if fallback_job:
                return JSONResponse(_serialize_ingestion_job(fallback_job))
            detail = response.get("error") or response.get("ingestionErrors") or response
            if not isinstance(detail, str):
                detail = str(detail)
            raise HTTPException(
                status_code=500,
                detail=f"Bedrock did not return an ingestion job ID. Response: {detail}",
            )
        job_details = _describe_ingestion_job(job_id)
        return JSONResponse(_serialize_ingestion_job(job_details))
    except ClientError as exc:
        if _is_conflict_error(exc):
            latest_job = _latest_ingestion_job()
            if latest_job:
                return JSONResponse(_serialize_ingestion_job(latest_job))
            return JSONResponse(
                {"error": "An ingestion job is already running.", "details": exc.response.get("Error", {}).get("Message")},
                status_code=409,
            )
        raise HTTPException(
            status_code=500,
            detail=exc.response.get("Error", {}).get("Message", "Failed to start ingestion job."),
        )


@app.get("/api/ingestion-status")
async def ingestion_status(jobId: str = Query(...)) -> JSONResponse:
    _ensure_ingestion_configured()

    try:
        job_details = _describe_ingestion_job(jobId)
    except ClientError as exc:
        error_info = exc.response.get("Error", {})
        code = error_info.get("Code", "")
        if code in {"ResourceNotFoundException", "NotFoundException"}:
            raise HTTPException(status_code=404, detail="Ingestion job not found.") from exc
        raise HTTPException(
            status_code=500,
            detail=error_info.get("Message", "Unable to fetch ingestion job status."),
        ) from exc

    if not job_details:
        raise HTTPException(status_code=404, detail="Ingestion job not found.")

    return JSONResponse(_serialize_ingestion_job(job_details))


class ChatRequest(BaseModel):
    session_id: str
    query: str
    conversation_history: List[dict] = []


class ChatResponse(BaseModel):
    answer: str
    task_type: str
    verification_label: str
    evidence_count: int
    loop_count: int
    evidence_chunks: List[dict] = []


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not knowledge_base_id:
        raise HTTPException(
            status_code=500,
            detail="KNOWLEDGE_BASE_ID must be configured for chat.",
        )

    initial_state = {
        "user_query": request.query,
        "session_id": request.session_id,
        "knowledge_base_id": knowledge_base_id,
        "conversation_history": request.conversation_history,
        "router_output": None,
        "evidence_chunks": [],
        "coverage_map": {},
        "producer_output": None,
        "verification": None,
        "loop_count": 0,
        "needs_reretrieval": False,
        "final_answer": "",
        "error": None,
    }

    try:
        result = await asyncio.to_thread(paper_graph.invoke, initial_state)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    raw_chunks = result.get("evidence_chunks", [])
    return ChatResponse(
        answer=result.get("final_answer", ""),
        task_type=result.get("router_output", {}).get("task_type", "UNKNOWN"),
        verification_label=result.get("verification", {}).get("label", "UNVERIFIED"),
        evidence_count=len(raw_chunks),
        loop_count=result.get("loop_count", 0),
        evidence_chunks=[
            {
                "index": i + 1,
                "text": chunk.get("text", ""),
                "score": chunk.get("score", 0),
                "source_uri": chunk.get("source_uri", ""),
                "metadata": chunk.get("metadata", {}),
            }
            for i, chunk in enumerate(raw_chunks)
        ],
    )


class DiagramRequest(BaseModel):
    session_id: str
    conversation_history: List[dict] = []


@app.post("/api/diagram")
async def generate_diagram(request: DiagramRequest):
    """Extract a concept graph from the paper using the knowledge base and LLM."""
    if not knowledge_base_id:
        raise HTTPException(
            status_code=500,
            detail="KNOWLEDGE_BASE_ID must be configured.",
        )

    from agents.bedrock_utils import retrieve_from_kb, invoke_llm, format_evidence, parse_json_response

    # Retrieve broad context about the paper
    queries = [
        "main research question objective contribution of this paper",
        "methods techniques algorithms approach used in this paper",
        "results findings outcomes metrics performance",
        "applications implications future work limitations",
        "datasets experiments evaluation setup",
    ]

    all_chunks = []
    seen = set()
    for q in queries:
        chunks = retrieve_from_kb(knowledge_base_id=knowledge_base_id, query=q, num_results=5)
        for c in chunks:
            text = c.get("text", "")
            if text and text not in seen:
                seen.add(text)
                all_chunks.append(c)

    all_chunks.sort(key=lambda c: c.get("score", 0), reverse=True)
    all_chunks = all_chunks[:20]

    evidence_text = format_evidence(all_chunks)

    # Also include conversation history for extra context
    convo_context = ""
    for msg in request.conversation_history[-6:]:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        if content:
            convo_context += f"{role}: {content[:500]}\n"

    system_prompt = """You are a research paper analyst. Given evidence chunks from a paper and conversation history, extract the key concepts and their relationships to build an interactive concept map.

Return a JSON object with this exact structure:
{
  "title": "Short paper title or topic",
  "nodes": [
    {
      "id": "unique_id",
      "label": "Short label (2-5 words)",
      "detail": "1-2 sentence description with specific facts from the paper",
      "evidence": "Direct quote or paraphrase from the paper supporting this concept",
      "group": "core|method|result|application"
    }
  ],
  "links": [
    {
      "source": "source_node_id",
      "target": "target_node_id",
      "relation": "short description of how they relate (2-5 words)"
    }
  ]
}

Guidelines:
- Extract 8-15 nodes representing REAL concepts from THIS paper (not generic labels)
- Use specific names, techniques, datasets, metrics, and findings from the evidence
- Each node MUST have a meaningful "detail" with actual information from the paper
- Each node MUST have "evidence" citing or paraphrasing the paper
- Create 10-20 links showing how concepts relate
- Groups: "core" for main topics/objectives, "method" for techniques/approaches, "result" for findings/metrics, "application" for uses/future work
- Make labels specific (e.g. "BERT Fine-tuning" not "Method", "92.3% F1 Score" not "Metrics")
- Return ONLY valid JSON, no markdown fences"""

    user_message = f"""Evidence from the paper:
{evidence_text}

{f"Conversation context:{chr(10)}{convo_context}" if convo_context else ""}

Extract the concept map for this paper."""

    try:
        raw = await asyncio.to_thread(
            invoke_llm,
            system=system_prompt,
            user_message=user_message,
            max_tokens=3000,
            temperature=0.1,
        )
        parsed = parse_json_response(raw)
        return JSONResponse(parsed)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/pdf/{session_id}")
async def get_pdf(session_id: str):
    """Serve the uploaded PDF for a given session from S3."""
    if not bucket or not region:
        raise HTTPException(status_code=500, detail="S3 not configured.")

    import io

    try:
        response = s3.list_objects_v2(
            Bucket=bucket,
            Prefix=f"sessions/{session_id}/",
            MaxKeys=1,
        )

        if "Contents" not in response or len(response["Contents"]) == 0:
            raise HTTPException(status_code=404, detail="PDF not found for this session.")

        pdf_key = response["Contents"][0]["Key"]
        pdf_object = s3.get_object(Bucket=bucket, Key=pdf_key)
        pdf_bytes = pdf_object["Body"].read()

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename={session_id}.pdf",
                "Cache-Control": "public, max-age=3600",
            },
        )
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code", "")
        if error_code == "NoSuchKey":
            raise HTTPException(status_code=404, detail="PDF not found.") from exc
        raise HTTPException(status_code=500, detail="Failed to fetch PDF.") from exc


@app.get("/health")
def health_check() -> JSONResponse:
    return JSONResponse(
        {"status": "ok", "uploads": _unsafe_upload_configured()},
    )
