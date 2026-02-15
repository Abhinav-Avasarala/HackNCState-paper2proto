import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './PdfPanel.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfPanel({ sessionId, isOpen, onClose, highlightedChunk }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const pdfUrl = sessionId ? `/api/pdf/${sessionId}` : null;

  // Reset state when session changes
  useEffect(() => {
    setNumPages(null);
    setPageNumber(1);
    setLoading(true);
    setError(null);
  }, [sessionId]);

  const onDocumentLoadSuccess = ({ numPages: n }) => {
    setNumPages(n);
    setLoading(false);
  };

  const onDocumentLoadError = () => {
    setError('Failed to load PDF');
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="pdf-panel">
      {/* Header */}
      <div className="pdf-panel-header">
        <div className="pdf-panel-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>Paper Viewer</span>
        </div>
        <button className="pdf-close-btn" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="11 17 6 12 11 7" />
            <line x1="6" y1="12" x2="18" y2="12" />
          </svg>
        </button>
      </div>

      {/* PDF Viewer */}
      <div className="pdf-viewer-scroll">
        {loading && !error && (
          <div className="pdf-status-msg">
            <div className="spinner" />
            <p>Loading PDF...</p>
          </div>
        )}
        {error && (
          <div className="pdf-status-msg error">
            <p>{error}</p>
          </div>
        )}

        {pdfUrl && (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
          >
            <Page
              pageNumber={pageNumber}
              renderTextLayer={true}
              renderAnnotationLayer={false}
              width={370}
            />
          </Document>
        )}
      </div>

      {/* Page Controls */}
      {numPages && (
        <div className="pdf-controls">
          <button
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="pdf-page-info">
            {pageNumber} / {numPages}
          </span>
          <button
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {/* Chunk Highlight Section */}
      {highlightedChunk && (
        <div className="chunk-highlight">
          <div className="chunk-highlight-header">
            <span className="chunk-badge">Chunk {highlightedChunk.index}</span>
            <span className="chunk-score">
              {(highlightedChunk.score * 100).toFixed(0)}% match
            </span>
          </div>
          <blockquote className="chunk-quote">{highlightedChunk.text}</blockquote>
        </div>
      )}
    </div>
  );
}
