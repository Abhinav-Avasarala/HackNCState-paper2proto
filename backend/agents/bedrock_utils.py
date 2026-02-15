from __future__ import annotations

import json
import os
import re
from pathlib import Path

import boto3
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

_region = os.getenv("AWS_REGION", "us-east-1")


def _get_session() -> boto3.Session:
    kwargs: dict = {}
    ak = os.getenv("AWS_ACCESS_KEY_ID")
    sk = os.getenv("AWS_SECRET_ACCESS_KEY")
    st = os.getenv("AWS_SESSION_TOKEN")
    if ak and sk:
        kwargs = {
            "aws_access_key_id": ak,
            "aws_secret_access_key": sk,
            "aws_session_token": st or None,
        }
    return boto3.Session(**kwargs)


_session = _get_session()

# Two distinct clients:
#   bedrock-agent-runtime  → Knowledge Base retrieve API
#   bedrock-runtime        → LLM converse API
_kb_client = _session.client("bedrock-agent-runtime", region_name=_region)
_llm_client = _session.client("bedrock-runtime", region_name=_region)


def retrieve_from_kb(
    knowledge_base_id: str,
    query: str,
    num_results: int = 5,
) -> list[dict]:
    """Query Bedrock Knowledge Base and return evidence chunks.

    Each chunk is a dict with keys: text, score, source_uri, metadata.
    """
    response = _kb_client.retrieve(
        knowledgeBaseId=knowledge_base_id,
        retrievalQuery={"text": query},
        retrievalConfiguration={
            "vectorSearchConfiguration": {
                "numberOfResults": num_results,
            }
        },
    )

    chunks: list[dict] = []
    for result in response.get("retrievalResults", []):
        content = result.get("content", {}).get("text", "")
        score = result.get("score", 0.0)
        location = result.get("location", {})
        source_uri = location.get("s3Location", {}).get("uri", "")
        metadata = result.get("metadata", {})

        chunks.append(
            {
                "text": content,
                "score": score,
                "source_uri": source_uri,
                "metadata": metadata,
            }
        )

    return chunks


def invoke_llm(
    system: str,
    user_message: str,
    model_id: str = "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    max_tokens: int = 2000,
    temperature: float = 0.2,
) -> str:
    """Invoke a Claude model on Bedrock via the Converse API.

    Returns the raw text response.
    """
    response = _llm_client.converse(
        modelId=model_id,
        system=[{"text": system}],
        messages=[
            {"role": "user", "content": [{"text": user_message}]},
        ],
        inferenceConfig={
            "maxTokens": max_tokens,
            "temperature": temperature,
        },
    )

    return response["output"]["message"]["content"][0]["text"]


def parse_json_response(raw: str) -> dict:
    """Parse JSON from an LLM response, stripping markdown fences if present."""
    cleaned = raw.strip()
    # Remove markdown code fences
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    # Try direct parse first
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    # Try to extract first JSON object from the text
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if match:
        return json.loads(match.group())
    raise ValueError(f"No valid JSON found in LLM response: {raw[:200]}")


def format_evidence(chunks: list[dict]) -> str:
    """Format evidence chunks into a numbered text block for LLM context."""
    parts: list[str] = []
    for i, chunk in enumerate(chunks, 1):
        score = chunk.get("score", 0)
        text = chunk.get("text", "").strip()
        # Truncate very long chunks to ~500 words
        words = text.split()
        if len(words) > 500:
            text = " ".join(words[:500]) + " [truncated]"
        parts.append(f"[Chunk {i}] (score: {score:.2f})\n{text}")
    return "\n\n".join(parts)
