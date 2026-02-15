from __future__ import annotations

from langgraph.graph import END, StateGraph

from agents.nodes.builder import builder_node
from agents.nodes.retriever import retriever_node
from agents.nodes.router import router_node
from agents.nodes.summarizer import summarizer_node
from agents.nodes.tutor import tutor_node
from agents.nodes.verifier import verifier_node
from agents.state import GraphState


def _select_producer(state: GraphState) -> str:
    """Route to the appropriate producer based on task_type."""
    task_type = state["router_output"]["task_type"]
    if task_type == "SUMMARY":
        return "summarizer"
    elif task_type == "QA_TUTOR":
        return "tutor"
    elif task_type == "BUILD":
        return "builder"
    else:  # MIXED — default to summarizer
        return "summarizer"


def _after_verification(state: GraphState) -> str:
    """Decide whether to loop back to retriever or finish."""
    if state.get("needs_reretrieval"):
        return "retriever"
    return END


def build_graph() -> StateGraph:
    """Construct and compile the 6-agent LangGraph."""
    graph = StateGraph(GraphState)

    # Add all nodes
    graph.add_node("router", router_node)
    graph.add_node("retriever", retriever_node)
    graph.add_node("summarizer", summarizer_node)
    graph.add_node("tutor", tutor_node)
    graph.add_node("builder", builder_node)
    graph.add_node("verifier", verifier_node)

    # Entry point
    graph.set_entry_point("router")

    # Router always goes to Retriever
    graph.add_edge("router", "retriever")

    # Retriever routes to the appropriate producer
    graph.add_conditional_edges(
        "retriever",
        _select_producer,
        {
            "summarizer": "summarizer",
            "tutor": "tutor",
            "builder": "builder",
        },
    )

    # All producers feed into the Verifier
    graph.add_edge("summarizer", "verifier")
    graph.add_edge("tutor", "verifier")
    graph.add_edge("builder", "verifier")

    # Verifier either loops back to Retriever or ends
    graph.add_conditional_edges(
        "verifier",
        _after_verification,
        {
            "retriever": "retriever",
            END: END,
        },
    )

    return graph.compile()


# Compile once at module level — reused across all requests
paper_graph = build_graph()
