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

The backend service lives in `backend/` and exposes `POST /api/upload`, which streams the PDF to your configured S3 bucket. It expects a `multipart/form-data` request with the file field named `paper`; the React upload card already sends the file under that key.

### To run the backend

1. Copy the example env file and fill in your AWS credentials:
   ```bash
   cd backend
   cp .env.example .env
   ```
2. Populate the new `.env` with your AWS region, bucket name, credentials (or rely on IAM environment variables), and optional PORT override.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
   The service listens on the port defined in `.env` (default `4000`).

## Environment variables

Ensure `.env` (copied from `.env.example`) contains:

- `AWS_REGION`: the region of your S3 bucket.
- `S3_BUCKET`: the bucket name where PDFs will be stored.
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN`: credentials used by `@aws-sdk/client-s3`. Omit them if you prefer IAM roles.
- `PORT`: optional, defaults to `4000`.


## Notes

- Styling is handled with plain CSS in `frontend/src/App.css` and `index.css`.
- The frontend uses React 18 and `react-scripts` 6.
- For embedding workflows, connect the interface buttons and upload flows to your AWS services.
- Running `npm install` and any `npm` commands requires internet access; the scaffolding was created without hitting the npm registry from this environment.
