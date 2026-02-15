import './CodeViewerOverlay.css';
import React, { useEffect, useState } from 'react';

export default function CodeViewerOverlay({ isOpen, onClose, implementations }) {
  const [selectedImpl, setSelectedImpl] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState(null);

  useEffect(() => {
    if (isOpen && implementations?.length > 0) {
      setSelectedImpl(0);
    }
  }, [isOpen, implementations]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (err) {
      setCopyFeedback('Failed to copy');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  if (!isOpen || !implementations || implementations.length === 0) {
    return null;
  }

  const impl = implementations[selectedImpl];

  return (
    <div className="code-viewer-overlay" onClick={onClose}>
      <div className="code-viewer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="code-viewer-header">
          <div className="code-viewer-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span>Evidence Exhibits</span>
          </div>
          <button className="close-btn" onClick={onClose} type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Implementation selector tabs */}
        {implementations.length > 1 && (
          <div className="code-viewer-tabs">
            {implementations.map((item, idx) => (
              <button
                key={idx}
                className={`code-tab ${selectedImpl === idx ? 'active' : ''}`}
                onClick={() => setSelectedImpl(idx)}
                type="button"
              >
                {item.name}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="code-viewer-content">
          {/* Implementation name and metadata */}
          <div className="impl-header">
            <h2>{impl.name}</h2>
            <div className="impl-meta">
              <span className="lang-badge">{impl.language}</span>
            </div>
          </div>

          {/* Paper basis */}
          <div className="impl-section">
            <h3>Paper Basis</h3>
            <p className="impl-text">{impl.paper_basis}</p>
          </div>

          {/* Code block */}
          <div className="impl-section">
            <div className="code-header">
              <h3>Code</h3>
              <button
                className="copy-btn"
                onClick={() => handleCopy(impl.code)}
                type="button"
              >
                {copyFeedback || (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="code-block">
              <code className={`language-${impl.language}`}>{impl.code}</code>
            </pre>
          </div>

          {/* Explanation */}
          <div className="impl-section">
            <h3>Explanation</h3>
            <p className="impl-text">{impl.explanation}</p>
          </div>

          {/* Missing details (if any) */}
          {impl.missing_details && (
            <div className="impl-section warning">
              <h3>Missing Details / Assumptions</h3>
              <p className="impl-text">{impl.missing_details}</p>
            </div>
          )}
        </div>

        {/* Navigation footer (if multiple implementations) */}
        {implementations.length > 1 && (
          <div className="code-viewer-footer">
            <button
              className="nav-btn"
              onClick={() => setSelectedImpl((prev) => Math.max(0, prev - 1))}
              disabled={selectedImpl === 0}
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Previous
            </button>
            <span className="impl-counter">
              {selectedImpl + 1} of {implementations.length}
            </span>
            <button
              className="nav-btn"
              onClick={() => setSelectedImpl((prev) => Math.min(implementations.length - 1, prev + 1))}
              disabled={selectedImpl === implementations.length - 1}
              type="button"
            >
              Next
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
