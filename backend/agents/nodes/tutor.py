from __future__ import annotations

from agents.bedrock_utils import format_evidence, invoke_llm
from agents.prompts.tutor_prompt import (
    TUTOR_DEEP_ADDENDUM,
    TUTOR_QA_SYSTEM_PROMPT,
    TUTOR_TEACH_SYSTEM_PROMPT,
)
from agents.state import GraphState

# Keywords that suggest the user wants teaching rather than a direct answer
_TEACH_KEYWORDS = {
    "explain", "teach", "how does", "what is", "walk me through",
    "break down", "help me understand", "eli5", "like i'm a beginner",
    "step by step", "intuition", "why does",
}


def _is_teaching_request(query: str) -> bool:
    query_lower = query.lower()
    return any(kw in query_lower for kw in _TEACH_KEYWORDS)


def tutor_node(state: GraphState) -> dict:
    """Answer questions or teach concepts grounded in evidence."""
    evidence_text = format_evidence(state["evidence_chunks"])
    depth = state["router_output"].get("depth", "standard")
    query = state["user_query"]

    if _is_teaching_request(query):
        system = TUTOR_TEACH_SYSTEM_PROMPT
    else:
        system = TUTOR_QA_SYSTEM_PROMPT

    if depth == "deep":
        system += "\n" + TUTOR_DEEP_ADDENDUM

    user_msg = f"User question: {query}\n\nDepth: {depth}\n\nEvidence from the paper:\n{evidence_text}"

    output = invoke_llm(
        system=system,
        user_message=user_msg,
        model_id="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        max_tokens=2500 if depth == "deep" else 1500,
    )

    return {"producer_output": output}
