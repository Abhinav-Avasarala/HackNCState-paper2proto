import os
import uuid
from datetime import datetime
from pathlib import Path

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile, Query
from fastapi.responses import JSONResponse
from langgraph.graph import MessagesState, START, END, StateGraph
from pydantic import BaseModel, Extra

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

bucket = os.getenv("S3_BUCKET")
region = os.getenv("AWS_REGION")
knowledge_base_id = os.getenv("KNOWLEDGE_BASE_ID")
data_source_id = os.getenv("DATA_SOURCE_ID")
foundation_model_arn = os.getenv("FOUNDATION_MODEL_ARN")
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
DEFAULT_RAG_RESULTS = 6


class IngestRequest(BaseModel):
    sessionId: str
    s3Key: str | None = None
    fileName: str | None = None
    s3Bucket: str | None = None

    class Config:
        extra = Extra.allow


class QueryRequest(BaseModel):
    question: str
    maxResults: int | None = DEFAULT_RAG_RESULTS

    class Config:
        extra = Extra.ignore


def _format_datetime(value: datetime | None) -> str | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _get_bedrock_client():
    if not region:
        raise HTTPException(status_code=500, detail="AWS_REGION must be configured to start ingestion jobs.")
    return aws_session.client("bedrock-agent", region_name=region)


def _get_bedrock_agent_runtime_client():
    if not region:
        raise HTTPException(status_code=500, detail="AWS_REGION must be configured to query the knowledge base.")
    return aws_session.client("bedrock-agent-runtime", region_name=region)


def _get_foundation_model_arn() -> str:
    if foundation_model_arn:
        return foundation_model_arn
    if not region:
        raise HTTPException(status_code=500, detail="AWS_REGION must be configured to derive the foundation model ARN.")
    return f"arn:aws:bedrock:{region}::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0"


def _serialize_ingestion_job(job: dict) -> dict:
    return {
        "ingestionJobId": job.get("ingestionJobId"),
        "status": job.get("status"),
        "failureReasons": job.get("failureReasons", []),
        "startedAt": _format_datetime(job.get("startedAt")),
        "updatedAt": _format_datetime(job.get("updatedAt")),
    }


def _list_ingestion_jobs() -> list[dict]:
    client = _get_bedrock_client()
    response = client.list_ingestion_jobs(
        knowledgeBaseId=knowledge_base_id,
        dataSourceId=data_source_id,
        maxResults=5,
    )
    return response.get("ingestionJobs", [])


def _latest_ingestion_job() -> dict | None:
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


def _extract_job_id_from_response(response: dict) -> str | None:
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


def _rag_answer_bedrock(question: str, max_results: int | None = 6) -> str:
    if not knowledge_base_id:
        raise HTTPException(status_code=500, detail="Knowledge base is not configured.")
    model_arn = _get_foundation_model_arn()
    client = _get_bedrock_agent_runtime_client()
    try:
        response = client.retrieve_and_generate(
            input={"text": question},
            retrieveAndGenerateConfiguration={
                "type": "KNOWLEDGE_BASE",
                "knowledgeBaseConfiguration": {
                    "knowledgeBaseId": knowledge_base_id,
                    "modelArn": model_arn,
                    "retrievalConfiguration": {
                        "vectorSearchConfiguration": {
                            "numberOfResults": max(1, max_results or 6),
                        },
                    },
                },
            },
        )
    except ClientError as exc:
        error_info = exc.response.get("Error", {})
        raise HTTPException(status_code=500, detail=error_info.get("Message", "Failed to query Bedrock.") ) from exc

    output = response.get("output", {})
    text = output.get("text")
    if not text:
        raise HTTPException(status_code=500, detail="Bedrock did not return an answer.")
    return text


def _extract_message_value(message, key: str, fallback_keys: list[str] | None = None):
    if fallback_keys is None:
        fallback_keys = []
    if isinstance(message, dict):
        value = message.get(key)
        if value is not None:
            return value
        for alt_key in fallback_keys:
            value = message.get(alt_key)
            if value is not None:
                return value
        return None

    value = getattr(message, key, None)
    if value is not None:
        return value
    for alt_key in fallback_keys:
        value = getattr(message, alt_key, None)
        if value is not None:
            return value
    return None


def _normalize_role(role) -> str:
    if not role:
        return ""
    return str(role).strip().lower()


def _is_user_role(role) -> bool:
    return _normalize_role(role) in {"user", "human", "humanmessage", "human_message", "humanmessage"}


def _is_assistant_role(role) -> bool:
    return _normalize_role(role) in {"assistant", "ai", "robot", "aiassistant"}


def _latest_user_question(messages: list[dict] | None) -> str | None:
    if not messages:
        return None
    for message in reversed(messages):
        role = _extract_message_value(message, "role", ["type"])
        content = _extract_message_value(message, "content", ["text", "body"])
        if _is_user_role(role) and content:
            return str(content).strip()
    return None


def _rag_agent_node(state: MessagesState) -> dict:
    messages = state.get("messages") or []
    question = _latest_user_question(messages)
    if not question:
        raise ValueError("Langgraph agent requires a user prompt.")
    max_results = state.get("maxResults") or DEFAULT_RAG_RESULTS
    answer = _rag_answer_bedrock(question, max_results)
    return {"messages": messages + [{"role": "assistant", "content": answer}]}


_LANGGRAPH_RAG_GRAPH = StateGraph(MessagesState)
_LANGGRAPH_RAG_GRAPH.add_node(_rag_agent_node)
_LANGGRAPH_RAG_GRAPH.add_edge(START, "_rag_agent_node")
_LANGGRAPH_RAG_GRAPH.add_edge("_rag_agent_node", END)
_LANGGRAPH_RAG_GRAPH = _LANGGRAPH_RAG_GRAPH.compile()


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


@app.post("/api/query")
async def query_knowledge_base(request: QueryRequest) -> JSONResponse:
    initial_state = {
        "messages": [{"role": "user", "content": request.question}],
        "maxResults": request.maxResults,
    }
    try:
        result = _LANGGRAPH_RAG_GRAPH.invoke(initial_state)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    messages = result.get("messages") or []
    assistant_response = None
    for message in reversed(messages):
        role = _extract_message_value(message, "role", ["type"])
        if not _is_assistant_role(role):
            continue
        content = _extract_message_value(message, "content", ["text", "body"])
        if content:
            assistant_response = str(content)
            break

    if not assistant_response:
        raise HTTPException(status_code=500, detail="Langgraph did not return an assistant reply.")

    return JSONResponse({"answer": assistant_response})


@app.get("/health")
def health_check() -> JSONResponse:
    return JSONResponse(
        {"status": "ok", "uploads": _unsafe_upload_configured()},
    )
