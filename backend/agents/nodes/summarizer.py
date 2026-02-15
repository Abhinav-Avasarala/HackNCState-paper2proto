from __future__ import annotations

from agents.bedrock_utils import format_evidence, invoke_llm
from agents.prompts.summarizer_prompt import (
    SUMMARIZER_BRIEF_ADDENDUM,
    SUMMARIZER_DEEP_ADDENDUM,
    SUMMARIZER_SYSTEM_PROMPT,
)
from agents.state import GraphState


def summarizer_node(state: GraphState) -> dict:
    """Generate a structured paper summary from evidence chunks."""
    evidence_text = format_evidence(state["evidence_chunks"])
    depth = state["router_output"].get("depth", "standard")

    system = SUMMARIZER_SYSTEM_PROMPT
    if depth == "brief":
        system += "\n" + SUMMARIZER_BRIEF_ADDENDUM
    elif depth == "deep":
        system += "\n" + SUMMARIZER_DEEP_ADDENDUM

    user_msg = f"User query: {state['user_query']}\n\nDepth: {depth}\n\nEvidence from the paper:\n{evidence_text}"

    output = invoke_llm(
        system=system,
        user_message=user_msg,
        model_id="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        max_tokens=3000 if depth == "deep" else 1500,
    )

    return {"producer_output": output}
