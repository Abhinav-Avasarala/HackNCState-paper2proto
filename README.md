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


## Notes

- Styling is handled with plain CSS in `frontend/src/App.css` and `index.css`.
- The frontend uses React 18 and `react-scripts` 5.
- For embedding workflows, connect the interface buttons and upload flows to your AWS services.
- Running `npm install` and any `npm` commands requires internet access; the scaffolding was created without hitting the npm registry from this environment.
