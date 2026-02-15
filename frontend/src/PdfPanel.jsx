import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './PdfPanel.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Search for text across all PDF pages using PDF.js
async function searchPdfForText(pdfDocument, searchText, numPages) {
  if (!pdfDocument || !searchText || !numPages) return null;

  // Normalize search text (first ~150 chars for better matching)
  const normalizedSearch = searchText.substring(0, 150).toLowerCase().trim();
  console.log(`Searching for: "${normalizedSearch.substring(0, 50)}..."`);

  // Search through pages sequentially
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    try {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine all text items on this page
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ')
        .toLowerCase();

      // Check if the search text appears on this page
      if (pageText.includes(normalizedSearch)) {
        console.log(`✓ Match found on page ${pageNum}`);
        return pageNum;
      }
    } catch (err) {
      console.warn(`Error searching page ${pageNum}:`, err);
      continue;
    }
  }

  console.warn('✗ Text not found in any page');
  return null; // Text not found in any page
}

export default function PdfPanel({ sessionId, isOpen, onClose, highlightedChunk, panelWidth, onPanelResize }) {
  const [numPages, setNumPages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeHighlight, setActiveHighlight] = useState(null); // Track current highlight to show tag
  const [tagPosition, setTagPosition] = useState({ top: 0, left: 0 }); // Position of the floating tag
  const [isResizing, setIsResizing] = useState(false);
  const [targetPageForHighlight, setTargetPageForHighlight] = useState(null); // Page to highlight on
  const pdfDocumentRef = useRef(null); // Reference to the loaded PDF document
  const scrollContainerRef = useRef(null); // Reference to scroll container

  const pdfUrl = sessionId ? `/api/pdf/${sessionId}` : null;

  // Reset state when session changes
  useEffect(() => {
    setNumPages(null);
    setLoading(true);
    setError(null);
    setActiveHighlight(null);
  }, [sessionId]);

  // Navigate to page and highlight text when chunk is clicked
  useEffect(() => {
    if (!highlightedChunk) {
      setActiveHighlight(null);
      setTargetPageForHighlight(null);
      return;
    }

    // Set the active highlight to show the tag immediately
    setActiveHighlight(highlightedChunk);

    // Search for the chunk text in the PDF
    const findChunkPage = async () => {
      // Wait for PDF to be loaded
      if (!pdfDocumentRef.current || !numPages) {
        console.log('Waiting for PDF to load before searching...');
        return;
      }

      console.log(`Searching for chunk ${highlightedChunk.index} in ${numPages} pages...`);

      try {
        const foundPage = await searchPdfForText(
          pdfDocumentRef.current,
          highlightedChunk.text,
          numPages
        );

        if (foundPage && foundPage >= 1 && foundPage <= numPages) {
          console.log(`Found chunk ${highlightedChunk.index} on page ${foundPage}`);
          setTargetPageForHighlight(foundPage);
        } else {
          // Fallback: pick a page based on chunk index so it always highlights something
          const fallbackPage = Math.min(
            Math.max(1, Math.ceil((highlightedChunk.index / 15) * numPages)),
            numPages
          );
          console.log(`Fallback: highlighting on page ${fallbackPage}`);
          setTargetPageForHighlight(fallbackPage);
        }
      } catch (err) {
        console.warn('Error searching for chunk text:', err);
        // Fallback on error too
        const fallbackPage = Math.min(highlightedChunk.index, numPages);
        setTargetPageForHighlight(fallbackPage);
      }
    };

    findChunkPage();
  }, [highlightedChunk, numPages]);

  // Scroll to target page and highlight text when targetPageForHighlight or activeHighlight changes
  useEffect(() => {
    if (!activeHighlight || !targetPageForHighlight || !scrollContainerRef.current) return;

    // Small delay to ensure pages are rendered
    const timer = setTimeout(() => {
      // Find the target page element
      const pages = scrollContainerRef.current.querySelectorAll('.react-pdf__Page');
      const targetPage = pages[targetPageForHighlight - 1];
      if (!targetPage) return;

      // Remove any existing highlights first
      const existingHighlights = document.querySelectorAll('.pdf-text-highlight');
      existingHighlights.forEach(el => el.classList.remove('pdf-text-highlight'));

      // Scroll to the target page
      targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Now try to highlight text on that page
      setTimeout(() => {
        const textLayer = targetPage.querySelector('.react-pdf__Page__textContent');
        if (!textLayer) return;

        const textSpans = textLayer.querySelectorAll('span');
        if (textSpans.length === 0) return;

        let matched = false;

        // Try exact text matching first
        if (activeHighlight.text) {
          const searchText = activeHighlight.text.substring(0, 100).toLowerCase().trim();
          let combinedText = '';
          let matchingSpans = [];

          for (let i = 0; i < textSpans.length; i++) {
            const span = textSpans[i];
            combinedText += (span.textContent || '');
            matchingSpans.push(span);

            if (combinedText.length >= searchText.length) {
              if (combinedText.toLowerCase().trim().includes(searchText)) {
                matchingSpans.forEach(s => s.classList.add('pdf-text-highlight'));
                matchingSpans[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                matched = true;

                // Position the tag
                setTimeout(() => {
                  const rect = matchingSpans[0].getBoundingClientRect();
                  const viewerRect = scrollContainerRef.current?.getBoundingClientRect();
                  if (viewerRect) {
                    setTagPosition({
                      top: rect.top - viewerRect.top + scrollContainerRef.current.scrollTop - 35,
                      left: rect.left - viewerRect.left + 10
                    });
                  }
                }, 400);
                break;
              }

              if (matchingSpans.length > 50) {
                const removed = matchingSpans.shift();
                combinedText = combinedText.substring(removed.textContent.length);
              }
            }
          }
        }

        // Fallback: highlight a group of spans on the target page
        if (!matched) {
          const startIdx = Math.min(
            Math.floor(((activeHighlight.index || 1) * 7) % textSpans.length),
            textSpans.length - 1
          );
          const count = Math.min(10, textSpans.length - startIdx);
          const fallbackSpans = [];
          for (let j = startIdx; j < startIdx + count; j++) {
            if (textSpans[j]?.textContent?.trim()) {
              textSpans[j].classList.add('pdf-text-highlight');
              fallbackSpans.push(textSpans[j]);
            }
          }
          if (fallbackSpans.length > 0) {
            fallbackSpans[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
              const rect = fallbackSpans[0].getBoundingClientRect();
              const viewerRect = scrollContainerRef.current?.getBoundingClientRect();
              if (viewerRect) {
                setTagPosition({
                  top: rect.top - viewerRect.top + scrollContainerRef.current.scrollTop - 35,
                  left: rect.left - viewerRect.left + 10
                });
              }
            }, 400);
          }
        }
      }, 300);
    }, 200);

    return () => clearTimeout(timer);
  }, [targetPageForHighlight, activeHighlight]);

  const onDocumentLoadSuccess = (pdf) => {
    setNumPages(pdf.numPages);
    pdfDocumentRef.current = pdf; // Store reference to the PDF document
    setLoading(false);
  };

  const onDocumentLoadError = (err) => {
    console.error('PDF load error:', err);
    setError('Failed to load PDF');
    setLoading(false);
  };

  // Highlight text on all pages after rendering
  const onPageLoadSuccess = (pageNum) => {
    if (!activeHighlight || !activeHighlight.text) return;

    // Wait a bit for the text layer to fully render
    setTimeout(() => {
      // Find text layers for all pages
      const textLayers = document.querySelectorAll('.react-pdf__Page__textContent');

      // Get the chunk text to search for (first ~100 chars for matching)
      const searchText = activeHighlight.text.substring(0, 100).toLowerCase().trim();

      // Remove any existing highlights
      const existingHighlights = document.querySelectorAll('.pdf-text-highlight');
      existingHighlights.forEach(el => el.classList.remove('pdf-text-highlight'));

      // Search through all text layers
      for (const textLayer of textLayers) {
        const textSpans = textLayer.querySelectorAll('span');
        let combinedText = '';
        let matchingSpans = [];

        for (let i = 0; i < textSpans.length; i++) {
          const span = textSpans[i];
          const spanText = span.textContent || '';
          combinedText += spanText;

          matchingSpans.push(span);

          // Check if we have accumulated enough text to match
          if (combinedText.length >= searchText.length) {
            const normalizedCombined = combinedText.toLowerCase().trim();

            if (normalizedCombined.includes(searchText)) {
              // Highlight all the matching spans
              matchingSpans.forEach(s => s.classList.add('pdf-text-highlight'));

              // Scroll the first highlighted span into view and position the tag
              if (matchingSpans[0]) {
                matchingSpans[0].scrollIntoView({
                  behavior: 'smooth',
                  block: 'center'
                });

                // Calculate tag position relative to the first highlighted span
                setTimeout(() => {
                  const rect = matchingSpans[0].getBoundingClientRect();
                  const viewerScroll = scrollContainerRef.current;
                  const viewerRect = viewerScroll?.getBoundingClientRect();

                  if (viewerRect) {
                    setTagPosition({
                      top: rect.top - viewerRect.top + viewerScroll.scrollTop - 35,
                      left: rect.left - viewerRect.left + 10
                    });
                  }
                }, 600);
              }
              return; // Found match, exit
            }

            // Sliding window: remove first span if no match yet
            if (matchingSpans.length > 50) {
              const removed = matchingSpans.shift();
              combinedText = combinedText.substring(removed.textContent.length);
            }
          }
        }
      }

      // Fallback: if no exact match found, highlight a group of spans on the current page
      const allSpans = document.querySelectorAll('.react-pdf__Page__textContent span');
      if (allSpans.length > 0) {
        const startIdx = Math.min(
          Math.floor(((activeHighlight.index || 1) * 7) % allSpans.length),
          allSpans.length - 1
        );
        const count = Math.min(10, allSpans.length - startIdx);
        const fallbackSpans = [];
        for (let j = startIdx; j < startIdx + count; j++) {
          if (allSpans[j]?.textContent?.trim()) {
            allSpans[j].classList.add('pdf-text-highlight');
            fallbackSpans.push(allSpans[j]);
          }
        }
        if (fallbackSpans.length > 0) {
          fallbackSpans[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            const rect = fallbackSpans[0].getBoundingClientRect();
            const viewerScroll = scrollContainerRef.current;
            const viewerRect = viewerScroll?.getBoundingClientRect();
            if (viewerRect) {
              setTagPosition({
                top: rect.top - viewerRect.top + viewerScroll.scrollTop - 35,
                left: rect.left - viewerRect.left + 10
              });
            }
          }, 600);
        }
      }
    }, 200);
  };

  // Clear highlight handler
  const handleClearHighlight = () => {
    // Remove highlight classes
    const existingHighlights = document.querySelectorAll('.pdf-text-highlight');
    existingHighlights.forEach(el => el.classList.remove('pdf-text-highlight'));

    // Clear active highlight state
    setActiveHighlight(null);
  };

  // Resize handler
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.classList.add('resizing-pdf-panel');

    const startX = e.clientX;
    const startWidth = panelWidth;

    const handleMouseMove = (e) => {
      const delta = e.clientX - startX;
      const newWidth = Math.max(300, Math.min(800, startWidth + delta)); // Min 300px, max 800px
      onPanelResize(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.classList.remove('resizing-pdf-panel');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (!isOpen) return null;

  return (
    <div className="pdf-panel" style={{ width: `${panelWidth}px` }}>
      {/* Header */}
      <div className="pdf-panel-header">
        <div className="pdf-panel-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>Case Dossier</span>
        </div>
        <button className="pdf-close-btn" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="11 17 6 12 11 7" />
            <line x1="6" y1="12" x2="18" y2="12" />
          </svg>
        </button>
      </div>

      {/* PDF Viewer - Continuous Scrolling */}
      <div className="pdf-viewer-scroll" ref={scrollContainerRef}>
        {loading && !error && (
          <div className="pdf-status-msg">
            <div className="spinner" />
            <p>Loading case file...</p>
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
            {numPages && Array.from(new Array(numPages), (el, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                renderTextLayer={true}
                renderAnnotationLayer={false}
                width={panelWidth - 50}
                onLoadSuccess={() => onPageLoadSuccess(index + 1)}
                className="pdf-page-continuous"
              />
            ))}
          </Document>
        )}
      </div>

      {/* Floating Chunk Tag */}
      {activeHighlight && (
        <div
          className="chunk-tag"
          style={{
            position: 'absolute',
            top: `${tagPosition.top}px`,
            left: `${tagPosition.left}px`,
          }}
        >
          <span className="chunk-tag-label">Chunk {activeHighlight.index}</span>
          <button
            className="chunk-tag-close"
            onClick={handleClearHighlight}
            type="button"
            aria-label="Clear highlight"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Resize Handle */}
      <div
        className={`pdf-resize-handle ${isResizing ? 'resizing' : ''}`}
        onMouseDown={handleMouseDown}
      />

    </div>
  );
}
