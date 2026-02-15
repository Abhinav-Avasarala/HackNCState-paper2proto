#!/usr/bin/env python3
"""Simple test of the Builder Agent code extraction."""

import sys
sys.path.insert(0, '/Users/noteesh/git/HackNCState-paper2proto')

from backend.agents.nodes.builder import extract_code_blocks

# Test with simpler example
test_text = """
**Implementation: Binary Search**
*Paper basis:* Section 2.1 efficient search algorithm [Chunk 1]
*Language:* python
```python
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
```
*Explanation:* Implements binary search for O(log n) lookup time.
*Missing details:* Assumes array is sorted.

**Implementation: Quick Sort Partition**
*Paper basis:* Section 2.3 describes partitioning step [Chunk 3]
*Language:* python
```python
def partition(arr, low, high):
    pivot = arr[high]
    i = low - 1
    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1
```
*Explanation:* Partitions array around pivot element as described in the paper.
*Missing details:* Paper doesn't specify pivot selection strategy.
"""

print("=" * 70)
print("Builder AI Agent - Code Extraction Test")
print("=" * 70)
print()

implementations = extract_code_blocks(test_text)

print(f"✓ Successfully extracted {len(implementations)} implementations\n")

for i, impl in enumerate(implementations, 1):
    print(f"[{i}] {impl['name']}")
    print(f"    Language: {impl['language']}")
    print(f"    Paper Basis: {impl['paper_basis']}")
    print(f"    Code Lines: {len(impl['code'].splitlines())}")
    print(f"    Has Missing Details: {'Yes' if impl['missing_details'] else 'No'}")
    print()

print("=" * 70)
print("What happens in the UI:")
print("=" * 70)
print()
print("1. User uploads research paper about sorting algorithms")
print("2. User asks: 'Show me the code for the algorithms'")
print("3. Builder Agent processes and extracts code implementations")
print("4. Chat response shows 'View Code (2 implementations)' button")
print("5. User clicks → CodeViewerOverlay opens with:")
print("   • Tab 1: Binary Search")
print("   • Tab 2: Quick Sort Partition")
print("6. Each tab shows:")
print("   • Syntax-highlighted code")
print("   • Paper basis with citations")
print("   • Explanation of what it does")
print("   • Missing details/assumptions")
print("   • Copy button for code")
print()
