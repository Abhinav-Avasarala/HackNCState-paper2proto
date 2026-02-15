from __future__ import annotations

from typing import Literal, Optional, TypedDict

TaskType = Literal["SUMMARY", "QA_TUTOR", "BUILD", "MIXED"]
Depth = Literal["brief", "standard", "deep"]
Strictness = Literal["low", "medium", "high"]
VerificationLabel = Literal[
    "SUPPORTED", "WEAKLY_SUPPORTED", "UNSUPPORTED", "CONTRADICTED"
]


class EvidenceChunk(TypedDict):
    text: str
    score: float
    source_uri: str
    metadata: dict


class RouterOutput(TypedDict):
    task_type: TaskType
    depth: Depth
    retrieval_targets: list[str]
    verification_strictness: Strictness


class VerificationResult(TypedDict):
    label: VerificationLabel
    explanation: str
    unsupported_claims: list[str]


class GraphState(TypedDict):
    # --- Inputs (set once at entry) ---
    user_query: str
    session_id: str
    knowledge_base_id: str
    conversation_history: list[dict]  # [{role, content}, ...]

    # --- Router output ---
    router_output: Optional[RouterOutput]

    # --- Retriever output ---
    evidence_chunks: list[EvidenceChunk]
    coverage_map: dict  # retrieval_target -> bool

    # --- Producer output (Summarizer / Tutor / Builder) ---
    producer_output: Optional[str]

    # --- Verifier output ---
    verification: Optional[VerificationResult]

    # --- Loop control ---
    loop_count: int
    needs_reretrieval: bool

    # --- Final ---
    final_answer: str
    error: Optional[str]
