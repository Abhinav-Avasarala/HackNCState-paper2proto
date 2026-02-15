from __future__ import annotations

from agents.bedrock_utils import invoke_llm, parse_json_response
from agents.prompts.router_prompt import ROUTER_SYSTEM_PROMPT
from agents.state import GraphState


def _format_history(history: list[dict]) -> str:
    if not history:
        return "(no prior conversation)"
    lines: list[str] = []
    for msg in history[-6:]:  # last 6 messages for context
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        lines.append(f"{role}: {content}")
    return "\n".join(lines)


def router_node(state: GraphState) -> dict:
    """Classify the user query and produce a routing plan."""
    user_msg = f"User query: {state['user_query']}"

    history = state.get("conversation_history", [])
    if history:
        user_msg += f"\n\nConversation so far:\n{_format_history(history)}"

    raw = invoke_llm(
        system=ROUTER_SYSTEM_PROMPT,
        user_message=user_msg,
        model_id="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        max_tokens=500,
    )

    try:
        parsed = parse_json_response(raw)
    except (ValueError, KeyError):
        # Fallback: treat as a Q&A request with the raw query
        parsed = {
            "task_type": "QA_TUTOR",
            "depth": "standard",
            "retrieval_targets": [state["user_query"]],
            "verification_strictness": "medium",
        }
        return {"router_output": parsed}

    # Validate and set defaults
    valid_task_types = {"SUMMARY", "QA_TUTOR", "BUILD", "MIXED"}
    if parsed.get("task_type") not in valid_task_types:
        parsed["task_type"] = "QA_TUTOR"

    if parsed.get("depth") not in {"brief", "standard", "deep"}:
        parsed["depth"] = "standard"

    if not isinstance(parsed.get("retrieval_targets"), list) or not parsed["retrieval_targets"]:
        parsed["retrieval_targets"] = [state["user_query"]]

    if parsed.get("verification_strictness") not in {"low", "medium", "high"}:
        parsed["verification_strictness"] = "medium"

    return {"router_output": parsed}
