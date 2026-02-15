# PaperToPaper

An AI-powered research paper assistant that turns static PDFs into conversational, context-aware explanations. The frontend is a minimal React (JavaScript) app powered by `react-scripts` that introduces the experience while the backend handles AWS workflows (S3 uploads, Bedrock embeddings, and OpenSearch vector stores).

## Frontend

The UI is located in `frontend/` and ships with a lightweight hero, upload card, and workflow overview. The upload button triggers `/api/upload` via the built-in CRA proxy so you can keep sending papers to the backend without CORS overrides.

### To run the frontend

1. Install dependencies (requires network access):
   ```bash
   cd frontend
   npm install
   ```
2. Start the dev server:
   ```bash
   npm start
   ```
3. Visit `http://localhost:3000/` (default CRA port) once the server finishes compiling to see the interface.

## Backend upload service

The backend service now lives in `backend/` as a FastAPI app that mirrors the previous upload contract (`POST /api/upload` with a `multipart/form-data` field named `paper`). The handler streams the file to your S3 bucket via `boto3`, and a simple `/health` endpoint reports whether the required AWS configuration is present.

### To run the backend

1. Copy the example env file and fill in your AWS credentials:
   ```bash
   cd backend
   cp .env.example .env
   ```
2. Populate `.env` with `AWS_REGION`, `S3_BUCKET`, and your credentials (or rely on IAM environment variables). `PORT` can override the listening port used when running the server.
3. Install dependencies:
   ```bash
   python -m pip install -r requirements.txt
   ```
4. Start the server (default port `4000`, or override via `PORT`):
   ```bash
   PORT=4000 uvicorn app:app --host 0.0.0.0 --port ${PORT:-4000}
   ```
   The FastAPI server now handles the same upload workflow expected by the frontend.

## Environment variables

Ensure `.env` (copied from `.env.example`) contains:

- `AWS_REGION`: the region of your S3 bucket.
- `S3_BUCKET`: the bucket name where PDFs will be stored.
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN`: credentials consumed by `boto3`. Omit them if you prefer IAM roles.
- `PORT`: optional, defaults to `4000`.
- `KNOWLEDGE_BASE_ID`: the Bedrock knowledge base that is tied to your OpenSearch vector store.
- `DATA_SOURCE_ID`: the knowledge base data source (must be configured to scan the `sessions/` prefix where uploads land).

### Ingestion workflow
- After an upload completes, the frontend POSTs `/api/ingest` with the `sessionId` + S3 metadata, then polls `GET /api/ingestion-status` until the job reports `COMPLETE`, `FAILED`, or `STOPPED`.
- Make sure the knowledge base data source is pointed at the `s3://{S3_BUCKET}/sessions/` prefix so each ingestion job sees only the newest session files.


## Builder AI Agent

The system includes a **Builder AI Agent** that extracts small, visualizable code implementations from research papers. This agent:

- **Extracts code snippets** (10-50 lines) from papers describing algorithms, methods, or implementations
- **Provides evidence-based implementations** traceable to specific paper sections with citations
- **Supports multiple languages**: Python, JavaScript, pseudocode, and more
- **Interactive code viewer**: Beautiful overlay UI with syntax highlighting, copy-to-clipboard, and navigation

### Using the Builder Agent

1. Upload a research paper that describes algorithms or code implementations
2. Ask implementation questions:
   - "Show me how to implement the algorithm from section 3"
   - "Extract the attention mechanism as Python code"
   - "Give me code for the data preprocessing steps"
3. Click "View Code" when it appears to see extracted implementations
4. Browse, copy, and use the code snippets in your projects

### Documentation

- **Quick Start**: See [QUICKSTART.md](QUICKSTART.md) for 5-minute setup guide
- **Detailed Guide**: See [BUILDER_AGENT.md](BUILDER_AGENT.md) for comprehensive documentation
- **Implementation Details**: See [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for architecture overview

### Example Output

The Builder Agent extracts structured code implementations with:
- Name and description
- Paper basis with citations ([Chunk N])
- Programming language
- Clean, pedagogical code (10-50 lines)
- Explanation of what the code does
- Missing details or assumptions made

### What It's NOT

The Builder Agent is designed for **small, pedagogical code snippets**, not:
- Full production applications
- Complex multi-file systems
- Production-ready implementations
- UI/UX components (unless that's what the paper describes)

## Notes

- Styling is handled with plain CSS in `frontend/src/App.css` and `index.css`.
- The frontend uses React 18 and `react-scripts` 5.
- For embedding workflows, connect the interface buttons and upload flows to your AWS services.
- Running `npm install` and any `npm` commands requires internet access; the scaffolding was created without hitting the npm registry from this environment.
