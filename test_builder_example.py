#!/usr/bin/env python3
"""
Example demonstration of how the Builder AI Agent extracts code from papers.

This script simulates what the Builder Agent would output when given a research
paper about a simple algorithm.
"""

from backend.agents.nodes.builder import extract_code_blocks

# Simulated output from the Builder Agent LLM
# This is what the agent would generate after reading paper evidence
example_output = r"""
Based on the evidence from the paper, I've extracted the following code implementations:

## Code Implementations

**Implementation: Attention Mechanism**
*Paper basis:* Section 3.1 describes the scaled dot-product attention mechanism [Chunk 2] [Chunk 5]
*Language:* python
\`\`\`python
import numpy as np

def scaled_dot_product_attention(Q, K, V, mask=None):
    """
    Compute scaled dot-product attention as described in the paper.

    Args:
        Q: Query matrix of shape (batch, seq_len, d_k)
        K: Key matrix of shape (batch, seq_len, d_k)
        V: Value matrix of shape (batch, seq_len, d_v)
        mask: Optional mask matrix

    Returns:
        attention_output: Weighted values
        attention_weights: Attention distribution
    """
    d_k = Q.shape[-1]

    # Compute attention scores
    scores = np.matmul(Q, K.transpose(-2, -1)) / np.sqrt(d_k)

    # Apply mask if provided
    if mask is not None:
        scores = scores + (mask * -1e9)

    # Compute attention weights
    attention_weights = np.exp(scores) / np.sum(np.exp(scores), axis=-1, keepdims=True)

    # Apply attention to values
    attention_output = np.matmul(attention_weights, V)

    return attention_output, attention_weights
\`\`\`
*Explanation:* This implements the scaled dot-product attention mechanism from the paper, which computes attention by scaling the dot product of queries and keys by the square root of the dimension, then applying softmax and multiplying by values.
*Missing details:* The paper doesn't specify the exact initialization strategy for Q, K, V matrices or dropout rate.

**Implementation: Positional Encoding**
*Paper basis:* Section 3.2 describes sinusoidal positional encodings [Chunk 7]
*Language:* python
\`\`\`python
import numpy as np

def get_positional_encoding(seq_len, d_model):
    """
    Generate positional encodings using sine and cosine functions.

    Args:
        seq_len: Sequence length
        d_model: Model dimension

    Returns:
        pos_encoding: Positional encoding matrix of shape (seq_len, d_model)
    """
    position = np.arange(seq_len)[:, np.newaxis]
    div_term = np.exp(np.arange(0, d_model, 2) * -(np.log(10000.0) / d_model))

    pos_encoding = np.zeros((seq_len, d_model))
    pos_encoding[:, 0::2] = np.sin(position * div_term)
    pos_encoding[:, 1::2] = np.cos(position * div_term)

    return pos_encoding
\`\`\`
*Explanation:* This generates fixed positional encodings using sine and cosine functions of different frequencies, allowing the model to learn relative positions as described in the paper.
*Missing details:* The paper suggests this is one approach but doesn't specify if learned positional embeddings could be used instead.

## Implementation Plan

If you want to build a complete transformer model based on this paper:

1. **Set up the environment**: Install PyTorch or TensorFlow, NumPy, and relevant libraries [Chunk 1]
2. **Implement attention layers**: Use the scaled dot-product attention as the building block [Chunk 2]
3. **Build multi-head attention**: Concatenate multiple attention heads as described in Section 3.3 [Chunk 6]
4. **Add feed-forward networks**: Implement the position-wise FFN from Section 3.4 [Chunk 8]
5. **Stack encoder/decoder layers**: Combine components into N=6 layers as specified [Chunk 9]
6. **Training setup**: Use Adam optimizer with warmup as described in Section 4.1 [Chunk 11]
"""

def main():
    print("=" * 80)
    print("Builder AI Agent - Code Extraction Demo")
    print("=" * 80)
    print()

    # Extract code implementations
    implementations = extract_code_blocks(example_output)

    print(f"✓ Extracted {len(implementations)} code implementation(s)\n")

    for i, impl in enumerate(implementations, 1):
        print(f"Implementation #{i}")
        print(f"  Name: {impl['name']}")
        print(f"  Language: {impl['language']}")
        print(f"  Paper Basis: {impl['paper_basis'][:80]}...")
        print(f"  Code Length: {len(impl['code'].split(chr(10)))} lines")
        print(f"  Explanation: {impl['explanation'][:100]}...")
        if impl['missing_details']:
            print(f"  Missing Details: {impl['missing_details'][:80]}...")
        print()

    print("=" * 80)
    print("How this would appear in the UI:")
    print("=" * 80)
    print()
    print("1. User asks: 'Show me how to implement the attention mechanism'")
    print("2. Builder Agent processes the query and extracts code from paper")
    print("3. A 'View Code (2 implementations)' button appears in the chat")
    print("4. User clicks button → CodeViewerOverlay opens")
    print("5. User can:")
    print("   - Browse between implementations using tabs")
    print("   - Read the paper basis and citations")
    print("   - View syntax-highlighted code")
    print("   - Copy code to clipboard")
    print("   - See explanations and missing details")
    print("   - Navigate with Previous/Next buttons")
    print()

    print("=" * 80)
    print("Example JSON Response from API:")
    print("=" * 80)
    print()
    import json
    print(json.dumps({
        "answer": example_output,
        "task_type": "BUILD",
        "verification_label": "SUPPORTED",
        "evidence_count": 11,
        "loop_count": 0,
        "evidence_chunks": [],
        "code_implementations": implementations
    }, indent=2))

if __name__ == "__main__":
    main()
