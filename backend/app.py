import os
import uuid
from pathlib import Path

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

bucket = os.getenv("S3_BUCKET")
region = os.getenv("AWS_REGION")
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

s3 = boto3.Session(**session_kwargs).client("s3", region_name=region)
app = FastAPI(title="PaperToPaper backend")

def _unsafe_upload_configured() -> bool:
    return bool(bucket and region)


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


@app.get("/health")
def health_check() -> JSONResponse:
    return JSONResponse(
        {"status": "ok", "uploads": _unsafe_upload_configured()},
    )
