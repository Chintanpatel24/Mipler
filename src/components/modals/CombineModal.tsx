import React from 'react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

export const CombineModal: React.FC = () => {
  const {
    combineModalOpen, setCombineModalOpen,
    investigations, selectedForCombine,
    toggleCombineSelection, combineSelectedInvestigations,
  } = useWorkspaceStore();

  if (!combineModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="animate-fade-in" style={{
        width: 420, background: '#1a1a1a', border: '1px solid #2a2a2a',
        borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
        fontFamily: 'IBM Plex Sans, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid #222',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>Combine Workspaces</span>
          <button onClick={() => setCombineModalOpen(false)}
            style={{ padding: '3px 6px', color: '#444', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 3 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ccc')}
            onMouseLeave={e => (e.currentTarget.style.color = '#444')}>
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="8" y2="8" /><line x1="8" y1="1" x2="1" y2="8" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 16 }}>
          <p style={{ fontSize: 11, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
            Select which workspaces to combine. They will be placed side by side on a single canvas with spacing between them.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {investigations.map(inv => {
              const isSelected = selectedForCombine.includes(inv.id);
              return (
                <button
                  key={inv.id}
                  onClick={() => toggleCombineSelection(inv.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 6,
                    background: isSelected ? '#1a2a3a' : '#151515',
                    border: `1px solid ${isSelected ? '#2a4a6a' : '#222'}`,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: 18, height: 18, borderRadius: 4,
                    background: isSelected ? '#2a4a7a' : '#1a1a1a',
                    border: `1px solid ${isSelected ? '#4a8abf' : '#333'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#7ab3e8" strokeWidth="2" strokeLinecap="round">
                        <path d="M2 5L4 7L8 3" />
                      </svg>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: isSelected ? '#ddd' : '#999', fontWeight: 500 }}>
                      {inv.name}
                      {inv.isAiAnalysis && (
                        <span style={{ fontSize: 8, marginLeft: 6, padding: '1px 4px', background: '#0a1a0a', color: '#3a8a3a', border: '1px solid #1a3a1a', borderRadius: 3, fontFamily: 'IBM Plex Mono' }}>AI</span>
                      )}
                    </div>
                    <div style={{ fontSize: 9, color: '#444', fontFamily: 'IBM Plex Mono', marginTop: 2 }}>
                      {inv.nodes.length} nodes · {inv.edges.length} edges
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Info */}
          <div style={{
            padding: '10px 12px', background: '#111', border: '1px solid #1e1e1e',
            borderRadius: 6, marginBottom: 16,
          }}>
            <p style={{ fontSize: 10, color: '#555', lineHeight: 1.6 }}>
              <span style={{ color: '#3a6a5a' }}>Note: </span>
              Combined workspaces will be placed with <strong style={{ color: '#aaa' }}>1200px spacing</strong> between each other for clear visual separation.
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setCombineModalOpen(false)}
              style={{
                flex: 1, padding: '9px', borderRadius: 6, fontSize: 12,
                background: '#222', border: '1px solid #333', color: '#888',
                cursor: 'pointer', fontFamily: 'IBM Plex Sans',
              }}
            >
              Cancel
            </button>
            <button
              onClick={combineSelectedInvestigations}
              disabled={selectedForCombine.length < 2}
              style={{
                flex: 2, padding: '9px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                cursor: selectedForCombine.length < 2 ? 'default' : 'pointer',
                background: selectedForCombine.length < 2 ? '#111' : '#0a2540',
                border: `1px solid ${selectedForCombine.length < 2 ? '#222' : '#1a4a7a'}`,
                color: selectedForCombine.length < 2 ? '#333' : '#5ab0f0',
                fontFamily: 'IBM Plex Sans',
              }}
            >
              Combine {selectedForCombine.length} Workspace{selectedForCombine.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
