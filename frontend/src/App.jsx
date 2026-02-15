import './App.css';
import { useEffect, useRef, useState } from 'react';

const highlightBullets = [
  'Explain complex sections down to the sentence level.',
  'Answer follow-up questions with precise, document-grounded citations.',
  'Summarize contributions, datasets, metrics, and limitations.',
];

const uploadMessages = {
  idle: 'Drop a paper and we will store it in S3.',
  uploading: 'Uploading your paper…',
  success: 'Stored successfully. Ask follow-up questions after vectorization.',
  error: 'Something went wrong. Retry the upload.',
};

const FINAL_STATUSES = ['COMPLETE', 'FAILED', 'STOPPING', 'STOPPED'];

const safeGet = (key) => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key);
};

const safeSet = (key, value) => {
  if (typeof window === 'undefined') return;
  if (value === undefined || value === null) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, value);
};

export default function App() {
  const fileInputRef = useRef(null);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadMessage, setUploadMessage] = useState(uploadMessages.idle);
  const [sessionId, setSessionId] = useState(() => safeGet('sessionId'));
  const [s3Key, setS3Key] = useState(() => safeGet('s3Key'));
  const [fileName, setFileName] = useState(() => safeGet('fileName'));
  const [s3Bucket, setS3Bucket] = useState(() => safeGet('s3Bucket'));
  const [ingestionJobId, setIngestionJobId] = useState(() => safeGet('ingestionJobId'));
  const [ingestionStatus, setIngestionStatus] = useState(() => safeGet('ingestionStatus') || 'idle');
  const [failureReasons, setFailureReasons] = useState(() => {
    const stored = safeGet('failureReasons');
    return stored ? JSON.parse(stored) : [];
  });
  const [pollingError, setPollingError] = useState('');

  const triggerFilePicker = () => fileInputRef.current?.click();

  useEffect(() => {
    safeSet('sessionId', sessionId);
  }, [sessionId]);

  useEffect(() => {
    safeSet('s3Key', s3Key);
  }, [s3Key]);

  useEffect(() => {
    safeSet('fileName', fileName);
  }, [fileName]);

  useEffect(() => {
    safeSet('s3Bucket', s3Bucket);
  }, [s3Bucket]);

  useEffect(() => {
    safeSet('ingestionJobId', ingestionJobId);
  }, [ingestionJobId]);

  useEffect(() => {
    safeSet('ingestionStatus', ingestionStatus);
  }, [ingestionStatus]);

  useEffect(() => {
    safeSet('failureReasons', failureReasons.length ? JSON.stringify(failureReasons) : null);
  }, [failureReasons]);

  useEffect(() => {
    if (!ingestionJobId) return undefined;
    if (FINAL_STATUSES.includes(ingestionStatus)) return undefined;

    let isActive = true;

        const fetchStatus = async () => {
          try {
            const response = await fetch(`/api/ingestion-status?jobId=${encodeURIComponent(ingestionJobId)}`);
            if (!response.ok) {
              const body = await response.json().catch(() => ({}));
              setPollingError(body.detail || 'Unable to read ingestion status.');
              return;
            }
            const data = await response.json();
            if (!isActive) return;
            setIngestionStatus(data.status || 'IN_PROGRESS');
            setFailureReasons(data.failureReasons || []);
            setPollingError('');
          } catch (error) {
        if (!isActive) return;
        setPollingError(error.message || 'Unable to poll ingestion status.');
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [ingestionJobId, ingestionStatus]);

  const startIngestion = async ({ sessionId, s3Key, fileName, s3Bucket }) => {
    setIngestionJobId(null);
    setIngestionStatus('STARTING');
    setFailureReasons([]);
    setPollingError('');

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, s3Key, fileName, s3Bucket }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || body.detail || 'Ingestion request failed.');
      }

      const payload = await response.json();
      setIngestionJobId(payload.ingestionJobId || null);
      setIngestionStatus(payload.status || 'IN_PROGRESS');
      setFailureReasons(payload.failureReasons || []);
    } catch (error) {
      setIngestionStatus('FAILED');
      setFailureReasons([error.message || 'Unable to start ingestion job.']);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadStatus('uploading');
    setUploadMessage(uploadMessages.uploading);

    const formData = new FormData();
    formData.append('paper', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Upload failed');
      }

      const payload = await response.json();
      setUploadStatus('success');
      const storedKey = payload.s3Key || payload.key;
      const fileLabel = payload.fileName || storedKey || 'document';
      setUploadMessage(storedKey ? `Stored ${fileLabel} in S3.` : uploadMessages.success);

      setSessionId(payload.sessionId);
      setS3Key(payload.s3Key);
      setFileName(payload.fileName);
      setS3Bucket(payload.s3Bucket);

      await startIngestion({
        sessionId: payload.sessionId,
        s3Key: payload.s3Key,
        fileName: payload.fileName,
        s3Bucket: payload.s3Bucket,
      });
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(error.message || uploadMessages.error);
    }
  };

  const statusMessage = (() => {
    if (uploadStatus === 'uploading') {
      return 'Uploading to S3...';
    }
    if (ingestionJobId && !FINAL_STATUSES.includes(ingestionStatus)) {
      return 'Indexing (chunking + embedding)...';
    }
    if (FINAL_STATUSES.includes(ingestionStatus)) {
      if (ingestionStatus === 'COMPLETE') {
        return 'Ready';
      }
      return `Failed (${failureReasons.join('; ') || 'unknown'})`;
    }
    if (uploadStatus === 'success') {
      return 'Waiting for indexing to start...';
    }
    return uploadMessages.idle;
  })();

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="eyebrow">AI research companion</p>
        <h1>
          Turn static PDFs into searchable, explainable conversations.
        </h1>
        <p className="lede">
          Upload a paper, let the system build embeddings in AWS Bedrock +
          OpenSearch, and ask anything in plain language while the assistant stays
          grounded in your document.
        </p>
        <div className="hero-actions">
          <button type="button" onClick={triggerFilePicker}>
            Upload paper
          </button>
          <button type="button" className="ghost">
            See example conversation
          </button>
        </div>
      </header>

      <section className="upload-card">
        <input
          type="file"
          accept="application/pdf"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="visually-hidden"
        />
        <div className="upload-body">
          <div>
            <p className="upload-title">Upload to S3</p>
            <p className={`upload-status ${uploadStatus}`}>{uploadMessage}</p>
          </div>
          <button
            type="button"
            className={`upload-btn ${uploadStatus}`}
            onClick={triggerFilePicker}
          >
            {uploadStatus === 'uploading' ? 'Uploading…' : 'Choose PDF'}
          </button>
        </div>
      </section>

      <section className="ingestion-card">
        <div className="ingestion-header">
          <div>
            <p className="upload-title">Session ingestion</p>
            <p className={`upload-status ${ingestionStatus.toLowerCase()}`}>{statusMessage}</p>
          </div>
          <div className="session-id">
            {sessionId ? <p>Session: {sessionId}</p> : <p>No session yet—upload to begin.</p>}
          </div>
        </div>
        <div className="ingestion-body">
          <p><strong>Job:</strong> {ingestionJobId || 'waiting for job ID'}</p>
          <p><strong>Bucket:</strong> {s3Bucket || 'n/a'}</p>
          <p><strong>File:</strong> {fileName || 'n/a'}</p>
        </div>
        {failureReasons.length > 0 && (
          <div className="failure-reasons">
            <p>Failure reasons:</p>
            <ul>
              {failureReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
        {pollingError && <p className="failure-reasons">Polling issue: {pollingError}</p>}
      </section>

      <section className="highlight-panel">
        <h2>Why PaperToPaper?</h2>
        <ul>
          {highlightBullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </section>

      <section className="workflow">
        <article>
          <h3>1. Upload</h3>
          <p>Drop a PDF and we sync it straight to your S3 bucket.</p>
        </article>
        <article>
          <h3>2. Embed</h3>
          <p>
            AWS Bedrock and vector storage convert the text into knowledge-ready
            embeddings.
          </p>
        </article>
        <article>
          <h3>3. Chat</h3>
          <p>
            Ask whatever you need: summaries, explanations, or related work
            clarifications.
          </p>
        </article>
      </section>

      <footer className="footer">
        <p>Frontend: React + `react-scripts` (JavaScript). Backend handles AWS flows.</p>
        <p>Everything is intentionally minimal so you can plug your APIs directly.</p>
      </footer>
    </div>
  );
}
