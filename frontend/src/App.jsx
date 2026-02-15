import './App.css';
import { useRef, useState } from 'react';

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

export default function App() {
  const fileInputRef = useRef(null);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadMessage, setUploadMessage] = useState(uploadMessages.idle);

  const triggerFilePicker = () => fileInputRef.current?.click();

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
      setUploadMessage(
        payload.key ? `Stored as ${payload.key}.` : uploadMessages.success,
      );
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(error.message || uploadMessages.error);
    }
  };

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
