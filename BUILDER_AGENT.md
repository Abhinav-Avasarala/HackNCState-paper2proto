# Builder AI Agent - Implementation Guide

## Overview

The Builder AI Agent is designed to extract and present **small, visualizable code implementations** from research papers. It focuses on creating simple, pedagogical code snippets (10-50 lines) that demonstrate key concepts, algorithms, or methods described in the paper.

## Key Features

### 1. Code-Focused Extraction
- Extracts algorithms, formulas, and data structures from papers
- Generates small, demonstrative code pieces (NOT full production apps)
- Focuses on pedagogical value and understanding
- Supports multiple programming languages (Python, JavaScript, pseudocode, etc.)

### 2. Evidence-Based Implementation
- Every code snippet is traceable to evidence from the paper
- Includes citations using [Chunk N] format
- Explicitly labels extensions beyond the paper
- Identifies missing details or assumptions

### 3. Interactive Code Viewer
- Beautiful overlay interface for viewing code implementations
- Syntax highlighting for better readability
- Copy-to-clipboard functionality
- Support for multiple implementations per query
- Tabbed navigation when multiple code snippets exist

## Architecture

### Backend Components

#### 1. Builder Prompt (`backend/agents/prompts/builder_prompt.py`)
- System prompt that guides the LLM to extract code implementations
- Emphasizes small, visualizable snippets
- Requires paper basis and citations for all code
- Structured output format for easy parsing

#### 2. Builder Node (`backend/agents/nodes/builder.py`)
- Main processing node in the agent graph
- Extracts code blocks using regex pattern matching
- Structures code implementations with metadata:
  - `name`: Descriptive name for the implementation
  - `paper_basis`: Which section/concept this implements
  - `language`: Programming language
  - `code`: The actual code snippet
  - `explanation`: What the code does
  - `missing_details`: Any assumptions or missing information

#### 3. Graph State (`backend/agents/state.py`)
- Added `CodeImplementation` TypedDict
- Added `code_implementations` field to GraphState
- Enables passing code data through the agent pipeline

#### 4. API Endpoint (`backend/app.py`)
- Enhanced `/api/chat` endpoint to return code implementations
- Added `code_implementations` to ChatResponse model
- Initializes empty code_implementations in state

### Frontend Components

#### 1. CodeViewerOverlay Component (`frontend/src/CodeViewerOverlay.jsx`)
- React component for displaying code implementations
- Features:
  - Dark theme optimized for code viewing
  - Tabbed interface for multiple implementations
  - Copy button for each code snippet
  - Navigation controls (Previous/Next)
  - Escape key to close
  - Metadata display (language, paper basis, explanation)
  - Warning section for missing details

#### 2. Styling (`frontend/src/CodeViewerOverlay.css`)
- Modern dark theme (GitHub-inspired)
- Smooth animations and transitions
- Responsive design for mobile devices
- Custom scrollbar styling
- Syntax highlighting ready

#### 3. App Integration (`frontend/src/App.jsx`)
- Added code viewer state management
- "View Code" button appears when implementations are present
- Stores code implementations from API responses
- Clears code data when uploading new paper

## Usage

### For Users

1. **Upload a research paper** that describes algorithms, methods, or code
2. **Ask implementation questions** like:
   - "How do I implement the algorithm described in this paper?"
   - "Show me code for the method in section 3"
   - "Extract the key algorithm as code"
   - "Give me a code example of the approach"

3. **View code implementations**:
   - A "View Code" button appears in the assistant's response
   - Click to open the interactive code viewer
   - Browse multiple implementations if available
   - Copy code to clipboard
   - Read explanations and paper references

### Example Queries

- ✅ "Extract the attention mechanism as Python code"
- ✅ "Show me how to implement the loss function"
- ✅ "Give me code for the data preprocessing steps"
- ✅ "Implement the algorithm from section 4.2"
- ❌ "Build a full web application for this paper" (too complex)
- ❌ "Create a production-ready system" (not the goal)

## Output Format

The Builder Agent outputs code in this structured format:

```markdown
## Code Implementations

**Implementation: [Name]**
*Paper basis:* [Reference to paper section] [Chunk citations]
*Language:* [python/javascript/pseudocode]
```[language]
[code snippet]
```
*Explanation:* [What the code does]
*Missing details:* [Any assumptions made]
```

## Design Principles

### DO:
- Extract small, focused code snippets (10-50 lines)
- Focus on core algorithms and key logic
- Make code pedagogical and easy to understand
- Cite evidence from the paper
- Identify missing details explicitly

### DON'T:
- Create full production applications
- Build complex multi-file systems
- Add unnecessary features or abstractions
- Generate code not supported by the paper
- Create UI components (unless that's what the paper describes)

## Testing

### Backend Test
```bash
cd backend
python -c "from agents.nodes.builder import extract_code_blocks; print(extract_code_blocks('test'))"
```

### Frontend Test
```bash
cd frontend
npm run build
```

### Integration Test
1. Start backend: `cd backend && python app.py`
2. Start frontend: `cd frontend && npm start`
3. Upload a research paper with algorithm descriptions
4. Ask: "Show me the main algorithm as code"
5. Verify code viewer appears with implementations

## Limitations

1. **Paper Dependency**: Can only extract code for concepts explicitly described in the paper
2. **Size Constraint**: Focuses on small snippets, not complete applications
3. **Language Support**: Limited by what the LLM can generate (primarily Python, JavaScript, pseudocode)
4. **Detail Level**: May need to make assumptions when papers lack implementation details

## Future Enhancements

- [ ] Syntax highlighting with Prism.js or highlight.js
- [ ] Code execution sandbox for Python/JavaScript
- [ ] Side-by-side comparison of multiple implementations
- [ ] Export code to files or GitHub Gist
- [ ] Link code lines to specific paper sections
- [ ] Interactive parameter adjustment
- [ ] Unit test generation for code snippets

## Files Modified/Created

### Backend
- ✅ `backend/agents/prompts/builder_prompt.py` (modified)
- ✅ `backend/agents/nodes/builder.py` (modified)
- ✅ `backend/agents/state.py` (modified)
- ✅ `backend/app.py` (modified)

### Frontend
- ✅ `frontend/src/CodeViewerOverlay.jsx` (created)
- ✅ `frontend/src/CodeViewerOverlay.css` (created)
- ✅ `frontend/src/App.jsx` (modified)

## Contributing

When enhancing the Builder Agent:
1. Keep code snippets small and focused
2. Maintain citation requirements
3. Test regex extraction patterns
4. Ensure responsive UI design
5. Add appropriate error handling
