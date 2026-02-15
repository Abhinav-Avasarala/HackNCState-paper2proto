import './App.css';
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import CodeViewerOverlay from './CodeViewerOverlay';
import DiagramOverlay from './DiagramOverlay';
import PdfPanel from './PdfPanel';

// Renders markdown but converts [Chunk N] into clickable citation buttons
function MarkdownWithCitations({ content, onChunkClick }) {
  const processChildren = (children) =>
    React.Children.map(children, (child) => {
      if (typeof child !== 'string') return child;
      const parts = child.split(/(\[Chunk \d+\])/g);
      return parts.map((part, i) => {
        const m = part.match(/^\[Chunk (\d+)\]$/);
        if (m) {
          const num = parseInt(m[1], 10);
          return (
            <button
              key={i}
              className="chunk-citation"
              onClick={() => onChunkClick(num)}
              type="button"
            >
              [{num}]
            </button>
          );
        }
        return part;
      });
    });

  const components = {
    p: ({ children }) => <p>{processChildren(children)}</p>,
    li: ({ children }) => <li>{processChildren(children)}</li>,
    strong: ({ children }) => <strong>{processChildren(children)}</strong>,
    em: ({ children }) => <em>{processChildren(children)}</em>,
  };

  return <ReactMarkdown components={components}>{content}</ReactMarkdown>;
}

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
  const chatEndRef = useRef(null);

  // Upload state
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadMessage, setUploadMessage] = useState('Submit a case file to begin investigation.');
  const [fileName, setFileName] = useState(() => safeGet('fileName'));

  // Session / ingestion state (internal — not shown to user)
  const [sessionId, setSessionId] = useState(() => safeGet('sessionId'));
  const [s3Key, setS3Key] = useState(() => safeGet('s3Key'));
  const [s3Bucket, setS3Bucket] = useState(() => safeGet('s3Bucket'));
  const [ingestionJobId, setIngestionJobId] = useState(() => safeGet('ingestionJobId'));
  const [ingestionStatus, setIngestionStatus] = useState(() => safeGet('ingestionStatus') || 'idle');
  const [failureReasons, setFailureReasons] = useState(() => {
    const stored = safeGet('failureReasons');
    return stored ? JSON.parse(stored) : [];
  });

  // Chat state
  const [messages, setMessages] = useState(() => {
    const stored = safeGet('chatMessages');
    return stored ? JSON.parse(stored) : [];
  });
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Diagram overlay state
  const [showDiagram, setShowDiagram] = useState(false);

  // Code viewer state
  const [showCodeViewer, setShowCodeViewer] = useState(false);
  const [codeImplementations, setCodeImplementations] = useState([]);

  // PDF panel state
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [highlightedChunk, setHighlightedChunk] = useState(null);
  const [latestChunks, setLatestChunks] = useState([]);
  const [pdfPanelWidth, setPdfPanelWidth] = useState(() => {
    const stored = safeGet('pdfPanelWidth');
    return stored ? parseInt(stored, 10) : 420;
  });

  const isReady = ingestionStatus === 'COMPLETE';
  const isProcessing =
    uploadStatus === 'uploading' ||
    (ingestionJobId && !FINAL_STATUSES.includes(ingestionStatus));

  const triggerFilePicker = () => fileInputRef.current?.click();

  // Persist to localStorage
  useEffect(() => { safeSet('sessionId', sessionId); }, [sessionId]);
  useEffect(() => { safeSet('s3Key', s3Key); }, [s3Key]);
  useEffect(() => { safeSet('fileName', fileName); }, [fileName]);
  useEffect(() => { safeSet('s3Bucket', s3Bucket); }, [s3Bucket]);
  useEffect(() => { safeSet('ingestionJobId', ingestionJobId); }, [ingestionJobId]);
  useEffect(() => { safeSet('ingestionStatus', ingestionStatus); }, [ingestionStatus]);
  useEffect(() => {
    safeSet('failureReasons', failureReasons.length ? JSON.stringify(failureReasons) : null);
  }, [failureReasons]);
  useEffect(() => {
    safeSet('chatMessages', messages.length ? JSON.stringify(messages) : null);
  }, [messages]);
  useEffect(() => {
    safeSet('pdfPanelWidth', pdfPanelWidth);
  }, [pdfPanelWidth]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll ingestion status
  useEffect(() => {
    if (!ingestionJobId) return undefined;
    if (FINAL_STATUSES.includes(ingestionStatus)) return undefined;

    let isActive = true;

    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `/api/ingestion-status?jobId=${encodeURIComponent(ingestionJobId)}`
        );
        if (!response.ok) return;
        const data = await response.json();
        if (!isActive) return;
        setIngestionStatus(data.status || 'IN_PROGRESS');
        setFailureReasons(data.failureReasons || []);
      } catch {
        // Silently retry on next poll
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [ingestionJobId, ingestionStatus]);

  // Update upload message based on overall status
  useEffect(() => {
    if (uploadStatus === 'uploading') {
      setUploadMessage('Filing case dossier...');
    } else if (isProcessing) {
      setUploadMessage(`Analyzing "${fileName || 'evidence'}"...`);
    } else if (isReady) {
      setUploadMessage(`Case "${fileName || 'file'}" ready. Begin interrogation.`);
    } else if (ingestionStatus === 'FAILED') {
      setUploadMessage('Case file corrupted. Resubmit evidence.');
    } else if (uploadStatus === 'error') {
      setUploadMessage('Submission failed. Try again.');
    } else {
      setUploadMessage('Submit a case file to begin investigation.');
    }
  }, [uploadStatus, ingestionStatus, isProcessing, isReady, fileName]);

  const startIngestion = async ({ sessionId: sid, s3Key: key, fileName: name, s3Bucket: bucket }) => {
    setIngestionJobId(null);
    setIngestionStatus('STARTING');
    setFailureReasons([]);

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, s3Key: key, fileName: name, s3Bucket: bucket }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || body.detail || 'Processing failed.');
      }

      const payload = await response.json();
      setIngestionJobId(payload.ingestionJobId || null);
      setIngestionStatus(payload.status || 'IN_PROGRESS');
      setFailureReasons(payload.failureReasons || []);
    } catch {
      setIngestionStatus('FAILED');
      setFailureReasons(['Unable to process paper.']);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    // Reset chat for new paper
    setMessages([]);
    setUploadStatus('uploading');

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
    } catch {
      setUploadStatus('error');
    }
  };

  const handleSend = async () => {
    const query = input.trim();
    if (!query || !isReady || isSending) return;

    const userMsg = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          query,
          conversation_history: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || 'Request failed.');
      }

      const data = await response.json();
      setLatestChunks(data.evidence_chunks || []);

      // Store code implementations if present
      if (data.code_implementations && data.code_implementations.length > 0) {
        setCodeImplementations(data.code_implementations);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          meta: { taskType: data.task_type, verified: data.verification_label },
          evidenceChunks: data.evidence_chunks || [],
          codeImplementations: data.code_implementations || [],
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry, something went wrong. ${err.message}`, error: true },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewPaper = () => {
    // Clear everything
    setUploadStatus('idle');
    setSessionId(null);
    setS3Key(null);
    setFileName(null);
    setS3Bucket(null);
    setIngestionJobId(null);
    setIngestionStatus('idle');
    setFailureReasons([]);
    setMessages([]);
    setInput('');
    setCodeImplementations([]);
  };

  const handleChunkClick = (chunkNum) => {
    // Find the chunk from the most recent message that has evidence, or from latestChunks
    let chunks = latestChunks;
    // Walk messages backward to find the most recent assistant message with evidence
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].evidenceChunks?.length) {
        chunks = messages[i].evidenceChunks;
        break;
      }
    }
    const chunk = chunks.find((c) => c.index === chunkNum);
    if (chunk) {
      setHighlightedChunk(chunk);
      setIsPdfOpen(true);
    }
  };

  // --- Determine which view to show ---
  const showChat = isReady || messages.length > 0;

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="topbar">
        <span className="topbar-brand">Paper2Proto</span>
        {fileName && (
          <span className="topbar-file">{fileName}</span>
        )}
        <div className="topbar-actions">
          {showChat && isReady && (
            <button type="button" className="btn-small ghost" onClick={() => setIsPdfOpen((v) => !v)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.35rem' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {isPdfOpen ? 'Hide Dossier' : 'Case File'}
            </button>
          )}
          {showChat && isReady && (
            <button type="button" className="btn-small ghost" onClick={() => setShowDiagram(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.35rem' }}>
                <circle cx="12" cy="12" r="3" />
                <circle cx="19" cy="7" r="2" />
                <circle cx="5" cy="17" r="2" />
                <circle cx="19" cy="17" r="2" />
                <path d="M14 12l3-3M10 14l-3 1M14 14l3 1" />
              </svg>
              Evidence Board
            </button>
          )}
          {showChat && (
            <button type="button" className="btn-small ghost" onClick={handleNewPaper}>
              New Case
            </button>
          )}
          <button type="button" className="btn-small" onClick={triggerFilePicker}>
            {fileName ? 'New Dossier' : 'Submit Case'}
          </button>
        </div>
      </header>

      <input
        type="file"
        accept="application/pdf"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="visually-hidden"
      />

      {!showChat ? (
        /* --- Landing / Upload view --- */
        <main className="landing">
          <div className="landing-content">
            <p className="eyebrow">Research Detective Agency</p>
            <h1>Crack the case. Uncover the evidence.</h1>
            <p className="lede">
              Submit your research dossier and interrogate the facts — extract leads,
              decode methodologies, blueprint implementations, and more. Every claim
              backed by hard evidence.
            </p>

            <div className="upload-area" onClick={triggerFilePicker}>
              <div className="upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="upload-area-label">
                {isProcessing ? uploadMessage : 'Submit case file'}
              </p>
              {!isProcessing && (
                <p className="upload-area-hint">PDF dossiers up to 50 MB</p>
              )}
              {isProcessing && <div className="spinner" />}
            </div>

            <div className="features">
              <div className="feature-card">
                <h3>Case Synopsis</h3>
                <p>Extract the full story — methods, findings, and key breakthroughs.</p>
              </div>
              <div className="feature-card">
                <h3>Interrogate</h3>
                <p>Question every detail. Get answers traced directly to the evidence.</p>
              </div>
              <div className="feature-card">
                <h3>Blueprint</h3>
                <p>Draft implementation plans, crack the code, and recreate the work.</p>
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* --- Chat view --- */
        <main
          className={`chat-container ${isPdfOpen ? 'with-pdf-panel' : ''}`}
          style={isPdfOpen ? { marginLeft: `${pdfPanelWidth}px` } : {}}
        >
          {/* Status bar */}
          <div className={`status-bar ${isReady ? 'ready' : isProcessing ? 'processing' : 'error'}`}>
            {isProcessing && <div className="spinner-small" />}
            <span>{uploadMessage}</span>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.length === 0 && isReady && (
              <div className="chat-empty">
                <p className="chat-empty-title">Case file ready for investigation</p>
                <p>Begin your interrogation:</p>
                <div className="suggestions">
                  {[
                    'Give me the case synopsis',
                    'What evidence supports the findings?',
                    'How do I crack this code?',
                    'Decode the methodology',
                  ].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="suggestion-chip"
                      onClick={() => { setInput(s); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const hasDiagramKeyword = msg.role === 'assistant' &&
                /\b(diagram|graph|visualization|structure|architecture|flowchart|concept\s+map)\b/i.test(msg.content);
              const hasCodeImplementations = msg.codeImplementations && msg.codeImplementations.length > 0;

              return (
                <div key={i} className={`chat-bubble ${msg.role} ${msg.error ? 'error' : ''}`}>
                  <div className="bubble-content">
                    {msg.role === 'assistant' ? (
                      <MarkdownWithCitations
                        content={msg.content}
                        onChunkClick={handleChunkClick}
                      />
                    ) : (
                      msg.content
                    )}
                  </div>
                  {hasCodeImplementations && (
                    <button
                      className="diagram-trigger-btn"
                      onClick={() => {
                        setCodeImplementations(msg.codeImplementations);
                        setShowCodeViewer(true);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                      <span>Examine Evidence ({msg.codeImplementations.length} piece{msg.codeImplementations.length > 1 ? 's' : ''})</span>
                    </button>
                  )}
                  {hasDiagramKeyword && (
                    <button
                      className="diagram-trigger-btn"
                      onClick={() => setShowDiagram(true)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <circle cx="19" cy="7" r="2" />
                        <circle cx="5" cy="17" r="2" />
                        <circle cx="19" cy="17" r="2" />
                        <path d="M14 12l3-3M10 14l-3 1M14 14l3 1" />
                      </svg>
                      <span>Conspiracy Board</span>
                    </button>
                  )}
                  {msg.meta && (
                    <div className="bubble-meta">
                      <span className="meta-tag">{msg.meta.taskType}</span>
                      {msg.meta.verified === 'SUPPORTED' && (
                        <span className="meta-tag verified">Verified</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {isSending && (
              <div className="chat-bubble assistant loading">
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-bar">
            <textarea
              className="chat-input"
              rows={1}
              placeholder={isReady ? 'Interrogate the evidence...' : 'Case file processing...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!isReady || isSending}
            />
            <button
              type="button"
              className="send-btn"
              onClick={handleSend}
              disabled={!input.trim() || !isReady || isSending}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </main>
      )}

      {/* PDF Panel */}
      <PdfPanel
        sessionId={sessionId}
        isOpen={isPdfOpen}
        onClose={() => { setIsPdfOpen(false); setHighlightedChunk(null); }}
        highlightedChunk={highlightedChunk}
        panelWidth={pdfPanelWidth}
        onPanelResize={setPdfPanelWidth}
      />

      {/* Code Viewer Overlay */}
      <CodeViewerOverlay
        isOpen={showCodeViewer}
        onClose={() => setShowCodeViewer(false)}
        implementations={codeImplementations}
      />

      {/* Diagram Overlay */}
      <DiagramOverlay
        isOpen={showDiagram}
        onClose={() => setShowDiagram(false)}
        sessionId={sessionId}
        conversationHistory={messages.map((m) => ({ role: m.role, content: m.content }))}
      />
    </div>
  );
}
