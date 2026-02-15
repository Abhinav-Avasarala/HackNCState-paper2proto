from __future__ import annotations

from agents.bedrock_utils import format_evidence, invoke_llm, parse_json_response
from agents.prompts.verifier_prompt import (
    VERIFIER_HIGH_STRICTNESS_ADDENDUM,
    VERIFIER_LOW_STRICTNESS_ADDENDUM,
    VERIFIER_SYSTEM_PROMPT,
)
from agents.state import GraphState

MAX_VERIFY_LOOPS = 2


def verifier_node(state: GraphState) -> dict:
    """Fact-check producer output against evidence. Triggers re-retrieval if needed."""
    evidence_text = format_evidence(state["evidence_chunks"])
    producer_text = state["producer_output"]
    strictness = state["router_output"].get("verification_strictness", "medium")
    loop_count = state.get("loop_count", 0)

    # Build system prompt with strictness level
    system = VERIFIER_SYSTEM_PROMPT
    if strictness == "high":
        system += "\n" + VERIFIER_HIGH_STRICTNESS_ADDENDUM
    elif strictness == "low":
        system += "\n" + VERIFIER_LOW_STRICTNESS_ADDENDUM

    user_msg = (
        f"Draft output to verify:\n{producer_text}\n\n"
        f"Evidence chunks:\n{evidence_text}"
    )

    raw = invoke_llm(
        system=system,
        user_message=user_msg,
        model_id="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        max_tokens=1000,
    )

    try:
        result = parse_json_response(raw)
    except (ValueError, KeyError):
        # If parsing fails, pass through with a warning
        return {
            "verification": {
                "label": "WEAKLY_SUPPORTED",
                "explanation": "Verification parse error — output passed through with caution.",
                "unsupported_claims": [],
            },
            "needs_reretrieval": False,
            "final_answer": producer_text,
        }

    # Ensure expected keys exist
    label = result.get("label", "WEAKLY_SUPPORTED")
    explanation = result.get("explanation", "")
    unsupported = result.get("unsupported_claims", [])

    verification = {
        "label": label,
        "explanation": explanation,
        "unsupported_claims": unsupported,
    }

    # Decide: re-retrieve or finalize
    should_loop = (
        label in ("UNSUPPORTED", "CONTRADICTED")
        and len(unsupported) > 0
        and loop_count < MAX_VERIFY_LOOPS
    )

    if should_loop:
        # Update retrieval targets to the unsupported claims for re-retrieval
        return {
            "verification": verification,
            "needs_reretrieval": True,
            "loop_count": loop_count + 1,
            "router_output": {
                **state["router_output"],
                "retrieval_targets": unsupported[:5],  # cap at 5 re-queries
            },
        }

    # Finalize: pass through or add verification note
    final = producer_text
    if label not in ("SUPPORTED", "WEAKLY_SUPPORTED") and unsupported:
        caveat_items = "\n".join(f"- {c}" for c in unsupported)
        final += (
            f"\n\n---\n"
            f"*Verification note: The following claims could not be fully verified "
            f"against the paper text:*\n{caveat_items}"
        )

    return {
        "verification": verification,
        "needs_reretrieval": False,
        "final_answer": final,
    }
