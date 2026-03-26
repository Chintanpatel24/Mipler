import React, { type ReactNode, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

const CARD_COLORS = [
  '#1e1e1e', '#1a1f2e', '#1f1a1a', '#1a1f1a', '#1f1e16',
  '#1e1a24', '#161e24', '#242016', '#ffffff', '#f5f5f0',
];

interface BaseCardProps {
  id: string;
  title: string;
  children: ReactNode;
  width?: number;
  cardColor?: string;
  onTitleChange?: (t: string) => void;
  headerExtra?: ReactNode;
}

export const BaseCard: React.FC<BaseCardProps> = ({
  id, title, children, width = 300, cardColor = '#1e1e1e', onTitleChange, headerExtra,
}) => {
  const removeCard = useWorkspaceStore((s) => s.removeCard);
  const setCardColor = useWorkspaceStore((s) => s.setCardColor);
  const [showColors, setShowColors] = useState(false);

  const isLight = cardColor === '#ffffff' || cardColor === '#f5f5f0';
  const textColor = isLight ? '#1a1a1a' : '#d4d4d4';
  const mutedColor = isLight ? '#888' : '#666';
  const borderColor = isLight ? '#ddd' : '#2a2a2a';
  const headerBg = isLight ? '#f9f9f7' : '#1a1a1a';
  const bodyBg = cardColor;

  // Clean handle style - no glow, n8n-like
  const handleStyle = {
    boxShadow: 'none',
  };

  return (
    <div
      className="mipler-card-wrapper"
      style={{
        width: `${width}px`,
        minHeight: '80px',
        border: `1px solid ${borderColor}`,
        borderRadius: 7,
        background: bodyBg,
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Top handles */}
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        style={{ ...handleStyle, top: -7, left: '40%', transform: 'translateX(-50%)', zIndex: 30 }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        style={{ ...handleStyle, top: -7, left: '60%', transform: 'translateX(-50%)', zIndex: 30 }}
      />
      
      {/* Bottom handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        style={{ ...handleStyle, bottom: -7, left: '40%', transform: 'translateX(-50%)', zIndex: 30 }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        style={{ ...handleStyle, bottom: -7, left: '60%', transform: 'translateX(-50%)', zIndex: 30 }}
      />
      
      {/* Left handles */}
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        style={{ ...handleStyle, left: -7, top: '40%', transform: 'translateY(-50%)', zIndex: 30 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        style={{ ...handleStyle, left: -7, top: '60%', transform: 'translateY(-50%)', zIndex: 30 }}
      />
      
      {/* Right handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        style={{ ...handleStyle, right: -7, top: '40%', transform: 'translateY(-50%)', zIndex: 30 }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        style={{ ...handleStyle, right: -7, top: '60%', transform: 'translateY(-50%)', zIndex: 30 }}
      />

      {/* Header */}
      <div
        className="card-drag-handle group"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 10px',
          borderBottom: `1px solid ${borderColor}`,
          background: headerBg,
          borderRadius: '7px 7px 0 0',
          cursor: 'grab',
        }}
      >
        {/* Color dot */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowColors(!showColors)}
            style={{
              width: 11, height: 11, borderRadius: '50%',
              background: cardColor === '#1e1e1e' ? '#444' : cardColor,
              border: '1.5px solid rgba(255,255,255,0.15)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title="Card color"
          />
          {showColors && (
            <>
              <div className="fixed inset-0 z-50" onClick={() => setShowColors(false)} />
              <div className="animate-fade-in" style={{
                position: 'absolute', top: 16, left: 0, zIndex: 50,
                background: '#1a1a1a', border: '1px solid #2a2a2a',
                borderRadius: 7, padding: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
                display: 'flex', gap: 4, flexWrap: 'wrap', width: 128,
              }}>
                {CARD_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setCardColor(id, c); setShowColors(false); }}
                    style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: c,
                      border: cardColor === c ? '2px solid #fff' : '2px solid #333',
                      cursor: 'pointer',
                      transition: 'transform 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                ))}
                <input
                  type="color"
                  value={cardColor}
                  onChange={(e) => setCardColor(id, e.target.value)}
                  style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #333', cursor: 'pointer', padding: 0 }}
                  title="Custom color"
                />
              </div>
            </>
          )}
        </div>

        {onTitleChange ? (
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            style={{
              flex: 1, background: 'transparent', fontWeight: 500, fontSize: 12,
              border: 'none', outline: 'none', color: textColor, fontFamily: 'inherit',
            }}
            placeholder="Title..."
          />
        ) : (
          <span style={{ flex: 1, fontWeight: 500, fontSize: 12, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </span>
        )}

        {headerExtra}

        <button
          onClick={() => removeCard(id)}
          style={{
            width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 4, color: mutedColor, background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, opacity: 0, transition: 'opacity 0.1s, color 0.1s',
          }}
          title="Remove"
          className="card-close-btn"
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = mutedColor)}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="1" y1="1" x2="8" y2="8"/><line x1="8" y1="1" x2="1" y2="8"/>
          </svg>
        </button>
      </div>

      <div style={{ padding: '8px 10px' }}>{children}</div>

      <style>{`
        .mipler-card-wrapper:hover .card-close-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
};
