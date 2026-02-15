import './DiagramOverlay.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const GROUP_COLORS = {
  core: '#6e9fff',
  method: '#9dd7ff',
  result: '#6ef0a6',
  application: '#fb7185',
};

const GROUP_LABELS = {
  core: 'Core Concepts',
  method: 'Methods',
  result: 'Results',
  application: 'Applications',
};

export default function DiagramOverlay({ isOpen, onClose, sessionId, conversationHistory }) {
  const graphRef = useRef();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isOpen || !sessionId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedNode(null);

    fetch('/api/diagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        conversation_history: conversationHistory || [],
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to generate diagram');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;

        setTitle(data.title || 'Research Concept Map');

        const nodes = (data.nodes || []).map((n) => ({
          id: n.id,
          label: n.label,
          detail: n.detail,
          evidence: n.evidence,
          group: n.group || 'core',
          color: GROUP_COLORS[n.group] || GROUP_COLORS.core,
          size: n.group === 'core' ? 8 : 6,
        }));

        const nodeIds = new Set(nodes.map((n) => n.id));
        const links = (data.links || [])
          .filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target))
          .map((l) => ({
            source: l.source,
            target: l.target,
            relation: l.relation || '',
          }));

        setGraphData({ nodes, links });

        setTimeout(() => {
          if (graphRef.current) graphRef.current.zoomToFit(400, 80);
        }, 600);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, sessionId, conversationHistory]);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node));
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isDragging) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="diagram-overlay" onClick={handleBackdropClick}>
      <div className="diagram-container">
        {/* Header */}
        <div className="diagram-header">
          <div className="diagram-title">
            <div className="diagram-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <circle cx="19" cy="7" r="2" />
                <circle cx="5" cy="17" r="2" />
                <circle cx="19" cy="17" r="2" />
                <path d="M14 12l3-3M10 14l-3 1M14 14l3 1" />
              </svg>
            </div>
            <span>{title || 'Research Concept Map'}</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="diagram-body">
          {/* Graph Canvas */}
          <div className="diagram-canvas">
            {loading && (
              <div className="diagram-loading">
                <div className="spinner" />
                <p>Analyzing paper and extracting concepts...</p>
              </div>
            )}
            {error && (
              <div className="diagram-error">
                <p>Could not generate diagram: {error}</p>
                <button className="btn-small" onClick={onClose}>Close</button>
              </div>
            )}
            {!loading && !error && (
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeLabel=""
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const x = node.x;
                  const y = node.y;
                  if (!isFinite(x) || !isFinite(y)) return;

                  const isSelected = selectedNode?.id === node.id;
                  const nodeSize = (node.size || 6) * (isSelected ? 1.4 : 1);
                  const color = node.color || '#6e9fff';

                  // Glow
                  const gradient = ctx.createRadialGradient(x, y, 0, x, y, nodeSize * 2.5);
                  gradient.addColorStop(0, color + (isSelected ? '60' : '30'));
                  gradient.addColorStop(1, 'transparent');
                  ctx.fillStyle = gradient;
                  ctx.beginPath();
                  ctx.arc(x, y, nodeSize * 2.5, 0, 2 * Math.PI);
                  ctx.fill();

                  // Circle
                  ctx.fillStyle = color;
                  ctx.beginPath();
                  ctx.arc(x, y, nodeSize, 0, 2 * Math.PI);
                  ctx.fill();

                  // Selected ring
                  if (isSelected) {
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2 / globalScale;
                    ctx.beginPath();
                    ctx.arc(x, y, nodeSize + 2 / globalScale, 0, 2 * Math.PI);
                    ctx.stroke();
                  }

                  // Label
                  const fontSize = Math.max(11 / globalScale, 2);
                  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';

                  const label = node.label || '';
                  const textWidth = ctx.measureText(label).width;
                  const labelY = y + nodeSize + fontSize * 0.8;

                  // Label pill background
                  const px = 5 / globalScale;
                  const py = 2.5 / globalScale;
                  const radius = 3 / globalScale;
                  const rectX = x - textWidth / 2 - px;
                  const rectY = labelY - fontSize / 2 - py;
                  const rectW = textWidth + px * 2;
                  const rectH = fontSize + py * 2;

                  ctx.fillStyle = 'rgba(5, 6, 10, 0.9)';
                  ctx.beginPath();
                  ctx.moveTo(rectX + radius, rectY);
                  ctx.lineTo(rectX + rectW - radius, rectY);
                  ctx.quadraticCurveTo(rectX + rectW, rectY, rectX + rectW, rectY + radius);
                  ctx.lineTo(rectX + rectW, rectY + rectH - radius);
                  ctx.quadraticCurveTo(rectX + rectW, rectY + rectH, rectX + rectW - radius, rectY + rectH);
                  ctx.lineTo(rectX + radius, rectY + rectH);
                  ctx.quadraticCurveTo(rectX, rectY + rectH, rectX, rectY + rectH - radius);
                  ctx.lineTo(rectX, rectY + radius);
                  ctx.quadraticCurveTo(rectX, rectY, rectX + radius, rectY);
                  ctx.closePath();
                  ctx.fill();

                  // Label border
                  ctx.strokeStyle = color + '50';
                  ctx.lineWidth = 0.5 / globalScale;
                  ctx.stroke();

                  // Label text
                  ctx.fillStyle = '#f4f6fb';
                  ctx.fillText(label, x, labelY);
                }}
                linkCanvasObject={(link, ctx, globalScale) => {
                  const start = link.source;
                  const end = link.target;
                  if (!isFinite(start.x) || !isFinite(end.x)) return;

                  // Draw link line
                  ctx.strokeStyle = 'rgba(110, 159, 255, 0.25)';
                  ctx.lineWidth = 1.5 / globalScale;
                  ctx.beginPath();
                  ctx.moveTo(start.x, start.y);
                  ctx.lineTo(end.x, end.y);
                  ctx.stroke();

                  // Draw relation label at midpoint
                  if (link.relation && globalScale > 0.6) {
                    const midX = (start.x + end.x) / 2;
                    const midY = (start.y + end.y) / 2;
                    const fontSize = Math.max(9 / globalScale, 1.5);
                    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    const tw = ctx.measureText(link.relation).width;
                    ctx.fillStyle = 'rgba(5, 6, 10, 0.8)';
                    ctx.fillRect(midX - tw / 2 - 3 / globalScale, midY - fontSize / 2 - 2 / globalScale, tw + 6 / globalScale, fontSize + 4 / globalScale);

                    ctx.fillStyle = 'rgba(110, 159, 255, 0.7)';
                    ctx.fillText(link.relation, midX, midY);
                  }
                }}
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={0.003}
                linkDirectionalParticleColor={() => 'rgba(110, 159, 255, 0.5)'}
                backgroundColor="rgba(0,0,0,0)"
                d3VelocityDecay={0.3}
                onNodeClick={handleNodeClick}
                onNodeDragStart={() => setIsDragging(true)}
                onNodeDragEnd={() => setTimeout(() => setIsDragging(false), 100)}
                enableNodeDrag={true}
                enableZoomInteraction={true}
                enablePanInteraction={true}
              />
            )}
          </div>

          {/* Detail Panel */}
          {selectedNode && (
            <div className="diagram-detail-panel">
              <button className="detail-close" onClick={() => setSelectedNode(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              <div className="detail-group-badge" style={{ background: selectedNode.color + '20', color: selectedNode.color }}>
                {GROUP_LABELS[selectedNode.group] || 'Concept'}
              </div>

              <h3 className="detail-label">{selectedNode.label}</h3>

              {selectedNode.detail && (
                <div className="detail-section">
                  <h4>Description</h4>
                  <p>{selectedNode.detail}</p>
                </div>
              )}

              {selectedNode.evidence && (
                <div className="detail-section evidence">
                  <h4>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    Evidence from Paper
                  </h4>
                  <blockquote>{selectedNode.evidence}</blockquote>
                </div>
              )}

              {/* Connected nodes */}
              <div className="detail-section">
                <h4>Connections</h4>
                <div className="detail-connections">
                  {graphData.links
                    .filter((l) => {
                      const sid = typeof l.source === 'object' ? l.source.id : l.source;
                      const tid = typeof l.target === 'object' ? l.target.id : l.target;
                      return sid === selectedNode.id || tid === selectedNode.id;
                    })
                    .map((l, i) => {
                      const sid = typeof l.source === 'object' ? l.source.id : l.source;
                      const tid = typeof l.target === 'object' ? l.target.id : l.target;
                      const otherId = sid === selectedNode.id ? tid : sid;
                      const other = graphData.nodes.find((n) => n.id === otherId);
                      if (!other) return null;
                      return (
                        <button
                          key={i}
                          className="connection-chip"
                          onClick={() => setSelectedNode(other)}
                          style={{ borderColor: other.color + '40' }}
                        >
                          <span className="connection-dot" style={{ background: other.color }} />
                          <span className="connection-label">{other.label}</span>
                          {l.relation && <span className="connection-rel">{l.relation}</span>}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="diagram-footer">
          <div className="diagram-legend">
            {Object.entries(GROUP_LABELS).map(([key, label]) => (
              <div className="legend-item" key={key}>
                <div className="legend-color" style={{ background: GROUP_COLORS[key] }} />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="diagram-hint">
            <span>Click a node for details  •  Drag to rearrange  •  Scroll to zoom</span>
          </div>
        </div>
      </div>
    </div>
  );
}
