from __future__ import annotations

import re
from typing import List, Dict, Any

from agents.bedrock_utils import format_evidence, invoke_llm
from agents.prompts.builder_prompt import BUILDER_SYSTEM_PROMPT
from agents.state import GraphState


def extract_code_blocks(text: str) -> List[Dict[str, Any]]:
    """Extract code implementations from the builder output."""
    implementations = []

    # Pattern to match implementation blocks
    impl_pattern = r'\*\*Implementation:\s*([^\n]+)\*\*\s*\*Paper basis:\*\s*([^\n]+)\s*\*Language:\*\s*([^\n]+)\s*```(\w+)?\n(.*?)```\s*\*Explanation:\*\s*([^*]+)(?:\*Missing details:\*\s*([^*\n]+))?'

    matches = re.finditer(impl_pattern, text, re.DOTALL)

    for match in matches:
        name = match.group(1).strip()
        paper_basis = match.group(2).strip()
        language = match.group(3).strip()
        code_lang = match.group(4) or language  # Use specified language or fallback
        code = match.group(5).strip()
        explanation = match.group(6).strip()
        missing_details = match.group(7).strip() if match.group(7) else None

        implementations.append({
            "name": name,
            "paper_basis": paper_basis,
            "language": code_lang,
            "code": code,
            "explanation": explanation,
            "missing_details": missing_details
        })

    return implementations


def builder_node(state: GraphState) -> dict:
    """Convert paper into actionable projects, implementation plans, or reproduction plans.

    Extracts small, visualizable code implementations from the paper.
    """
    evidence_text = format_evidence(state["evidence_chunks"])
    depth = state["router_output"].get("depth", "standard")

    user_msg = f"User request: {state['user_query']}\n\nDepth: {depth}\n\nEvidence from the paper:\n{evidence_text}"

    output = invoke_llm(
        system=BUILDER_SYSTEM_PROMPT,
        user_message=user_msg,
        model_id="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        max_tokens=3000 if depth == "deep" else 2000,
    )

    # Extract code implementations from the output
    code_implementations = extract_code_blocks(output)

    return {
        "producer_output": output,
        "code_implementations": code_implementations
    }
