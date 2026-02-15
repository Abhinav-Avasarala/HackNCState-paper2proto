from __future__ import annotations

from agents.bedrock_utils import format_evidence, invoke_llm
from agents.prompts.builder_prompt import BUILDER_SYSTEM_PROMPT
from agents.state import GraphState


def builder_node(state: GraphState) -> dict:
    """Convert paper into actionable projects, implementation plans, or reproduction plans."""
    evidence_text = format_evidence(state["evidence_chunks"])
    depth = state["router_output"].get("depth", "standard")

    user_msg = f"User request: {state['user_query']}\n\nDepth: {depth}\n\nEvidence from the paper:\n{evidence_text}"

    output = invoke_llm(
        system=BUILDER_SYSTEM_PROMPT,
        user_message=user_msg,
        model_id="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        max_tokens=3000 if depth == "deep" else 2000,
    )

    return {"producer_output": output}
