# Builder AI Agent - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Python 3.8+
- Node.js 14+
- AWS credentials configured (for knowledge base)

### 1. Start Backend
```bash
cd backend
pip install -r requirements.txt  # if not already installed
uvicorn app:app --reload --port 4000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:4000 (Press CTRL+C to quit)
```

### 2. Start Frontend
```bash
cd frontend
npm install  # if not already installed
npm start
```

Browser opens at `http://localhost:3000`

### 3. Test the Builder Agent

#### Step 1: Upload a Paper
- Click "Upload PDF" button
- Select a research paper that describes algorithms or code
- Wait for processing to complete (status bar turns green)

#### Step 2: Ask for Code Implementation
Try these example queries:
```
"Show me how to implement the main algorithm"
"Extract the key function as Python code"
"Give me code for the method described in section 3"
"Implement the data structure from the paper"
```

#### Step 3: View Code
When Builder Agent responds:
1. Look for "View Code (N implementations)" button
2. Click to open the Code Viewer
3. Explore the implementations
4. Copy code to use in your projects

## Example Papers to Try

### Great for Testing:
1. **Sorting Algorithms** - Papers describing QuickSort, MergeSort, etc.
2. **Neural Network Architectures** - Attention mechanisms, transformer models
3. **Data Structures** - Binary trees, hash tables, graphs
4. **Signal Processing** - FFT, filters, transforms
5. **Optimization Algorithms** - Gradient descent, genetic algorithms

### Example Queries by Paper Type:

**For Algorithm Papers:**
- "Show me the pseudocode as Python"
- "Implement the main algorithm"
- "Give me code for the optimization step"

**For ML Papers:**
- "Extract the attention mechanism as code"
- "Show me the loss function implementation"
- "Implement the training loop"

**For Data Structure Papers:**
- "Show me the insert operation"
- "Implement the search function"
- "Give me code for the balancing algorithm"

## What to Expect

### ✅ Good Results:
Papers that clearly describe:
- Algorithms with step-by-step logic
- Mathematical formulas that can be coded
- Data structures with operations
- Specific implementation details

### ⚠️ Limited Results:
Papers that are:
- Purely theoretical with no implementation details
- High-level overviews without specifics
- Focused on experiments/results rather than methods

## Features Overview

### Code Viewer Interface
- **Dark Theme**: Easy on the eyes for reading code
- **Tabs**: Navigate between multiple implementations
- **Copy Button**: One-click copy to clipboard
- **Citations**: See which paper sections support each code snippet
- **Explanations**: Understand what the code does
- **Missing Details**: Know what assumptions were made

### Code Quality
- **Small Snippets**: 10-50 lines, easy to understand
- **Pedagogical**: Focused on learning, not production use
- **Evidence-Based**: Traceable to paper content
- **Multiple Languages**: Python, JavaScript, pseudocode, etc.

## Troubleshooting

### Backend Issues

**"Module not found" error:**
```bash
cd backend
pip install -r requirements.txt
```

**"AWS credentials not found":**
- Check `.env` file has AWS keys
- Verify `KNOWLEDGE_BASE_ID` is set

### Frontend Issues

**"Cannot find module" error:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Build fails:**
```bash
npm run build
# Check console for specific errors
```

### No Code Implementations Returned

**Possible causes:**
1. Paper doesn't describe implementable code
2. Query too vague - be more specific
3. Evidence chunks don't contain implementation details

**Solutions:**
- Ask more specific questions: "Show me the X algorithm from section Y"
- Try different papers with clearer algorithmic descriptions
- Check that paper has been fully processed (status bar shows "ready")

## Tips for Best Results

### 1. Choose the Right Papers
✅ Papers with: algorithms, pseudocode, formulas, data structures
❌ Papers with: only theoretical results, surveys, literature reviews

### 2. Ask Specific Questions
✅ "Extract the binary search from section 3 as Python"
❌ "Show me some code from this paper"

### 3. Understand the Scope
- Builder extracts **small snippets**, not full applications
- Focus is on **understanding**, not production deployment
- Code is **pedagogical**, not optimized

### 4. Check Citations
- Each code snippet cites paper sections
- Use citations to verify correctness
- Missing details section shows assumptions

## API Testing

You can also test via API directly:

```bash
curl -X POST http://localhost:4000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "your-session-id",
    "query": "Show me how to implement the main algorithm",
    "conversation_history": []
  }'
```

Response includes:
```json
{
  "answer": "markdown response",
  "task_type": "BUILD",
  "code_implementations": [
    {
      "name": "Algorithm Name",
      "paper_basis": "Section X.Y [Chunk Z]",
      "language": "python",
      "code": "def algorithm():\n    ...",
      "explanation": "What it does...",
      "missing_details": "Assumptions made..."
    }
  ]
}
```

## Next Steps

Once comfortable with basic usage:

1. **Explore Different Papers**: Try various domains and algorithms
2. **Customize Queries**: Experiment with different question styles
3. **Compare Implementations**: Upload papers describing similar algorithms
4. **Build on Extracted Code**: Use snippets as starting points for projects
5. **Provide Feedback**: Report issues or suggest improvements

## Support

- **Documentation**: See `BUILDER_AGENT.md` for detailed guide
- **Implementation Details**: Check `IMPLEMENTATION_SUMMARY.md`
- **Issues**: Report at project repository

## Success Checklist

- [ ] Backend running on port 4000
- [ ] Frontend running on port 3000
- [ ] Paper uploaded and processed
- [ ] Query sent to Builder Agent
- [ ] "View Code" button appears
- [ ] Code Viewer opens successfully
- [ ] Code displays correctly
- [ ] Copy button works
- [ ] Can navigate between implementations

Once all checked, you're ready to extract code from research papers! 🎉
