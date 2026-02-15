from __future__ import annotations

from agents.bedrock_utils import retrieve_from_kb
from agents.state import GraphState


def retriever_node(state: GraphState) -> dict:
    """Query Bedrock Knowledge Base for each retrieval target.

    Deduplicates chunks, sorts by score, caps at 15.
    Builds a coverage map of which targets returned results.
    """
    targets = state["router_output"]["retrieval_targets"]
    kb_id = state["knowledge_base_id"]

    all_chunks: list[dict] = []
    coverage_map: dict[str, bool] = {}
    seen_texts: set[str] = set()

    # Carry over existing chunks from prior loops to avoid re-fetching duplicates
    for existing in state.get("evidence_chunks", []):
        text = existing.get("text", "")
        if text:
            seen_texts.add(text)
            all_chunks.append(existing)

    for target in targets:
        results = retrieve_from_kb(
            knowledge_base_id=kb_id,
            query=target,
            num_results=5,
        )
        coverage_map[target] = len(results) > 0

        for chunk in results:
            chunk_text = chunk.get("text", "")
            if chunk_text and chunk_text not in seen_texts:
                seen_texts.add(chunk_text)
                all_chunks.append(chunk)

    # Sort by relevance score descending, keep top 15
    all_chunks.sort(key=lambda c: c.get("score", 0), reverse=True)
    all_chunks = all_chunks[:15]

    return {
        "evidence_chunks": all_chunks,
        "coverage_map": coverage_map,
    }
