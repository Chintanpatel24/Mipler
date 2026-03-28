import React, { useState, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import type { CardType, LineStyle } from '../types';

const QUICK_COLORS = ['#888888','#e0e0e0','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899'];

export const Toolbar: React.FC = () => {
  const s = useWorkspaceStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showLineMenu, setShowLineMenu] = useState(false);
  const [editingInvId, setEditingInvId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingInvId && editRef.current) editRef.current.focus();
  }, [editingInvId]);

  const cards: { type: CardType; label: string; icon: string }[] = [
    { type: 'note', label: 'Note', icon: 'N' },
    { type: 'image', label: 'Image', icon: 'Img' },
    { type: 'pdf', label: 'PDF', icon: 'PDF' },
    { type: 'whois', label: 'WHOIS', icon: 'WH' },
    { type: 'dns', label: 'DNS', icon: 'DNS' },
    { type: 'reverse-image', label: 'Rev.Img', icon: 'RI' },
    { type: 'osint-framework', label: 'OSINT', icon: 'OS' },
  ];

  const activeInv = s.investigations.find((i) => i.id === s.activeInvestigationId);

  const startRename = (id: string, name: string) => {
    setEditingInvId(id);
    setEditingName(name);
  };

  const commitRename = () => {
    if (editingInvId && editingName.trim()) {
      s.renameInvestigation(editingInvId, editingName.trim());
    }
    setEditingInvId(null);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-40" style={{ background: '#161616', borderBottom: '1px solid #222' }}>
      <div className="flex items-center h-11 px-3 gap-1">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-3">
          <div style={{ width: 26, height: 26, background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#e0e0e0', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '-0.5px' }}>M</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#888', letterSpacing: '0.08em', fontFamily: 'IBM Plex Mono, monospace' }} className="hidden sm:inline">MIPLER</span>
        </div>

        {/* Investigation picker */}
        <div className="relative">
          <button
            onClick={() => s.setInvestigationMenuOpen(!s.investigationMenuOpen)}
            className="tb-btn"
            style={{ color: '#ccc', fontWeight: 500, fontSize: 12 }}
          >
            <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
              {activeInv?.name || 'Untitled Investigation'}
            </span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ opacity: 0.5, flexShrink: 0 }}>
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </button>

          {s.investigationMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => s.setInvestigationMenuOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-50 animate-fade-in"
                style={{ width: 260, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 7, boxShadow: '0 8px 24px rgba(0,0,0,0.6)', padding: '4px 0' }}>
                {s.investigations.map((inv) => (
                  <div key={inv.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
                      background: inv.id === s.activeInvestigationId ? '#222' : 'transparent' }}>
                    {editingInvId === inv.id ? (
                      <input
                        ref={editRef}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingInvId(null); }}
                        style={{ flex: 1, background: '#111', border: '1px solid #444', borderRadius: 4, padding: '2px 6px', fontSize: 12, color: '#e0e0e0', outline: 'none', fontFamily: 'inherit' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <button
                        onClick={() => { s.switchInvestigation(inv.id); s.setInvestigationMenuOpen(false); }}
                        style={{ flex: 1, textAlign: 'left', fontSize: 12, color: inv.id === s.activeInvestigationId ? '#e0e0e0' : '#888', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '2px 0' }}
                      >
                        {inv.name}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); startRename(inv.id, inv.name); }}
                      style={{ padding: '2px 4px', fontSize: 10, color: '#555', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 3, flexShrink: 0 }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#aaa')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
                      title="Rename"
                    >
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor"><path d="M7.5 1.5L9.5 3.5L3.5 9.5L1 10L1.5 7.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1" fill="none"/></svg>
                    </button>
                    {s.investigations.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${inv.name}"?`)) s.removeInvestigation(inv.id); }}
                        style={{ padding: '2px 4px', fontSize: 10, color: '#555', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 3, flexShrink: 0 }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
                        title="Delete"
                      >
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor"><line x1="1" y1="1" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5"/><line x1="8" y1="1" x2="1" y2="8" stroke="currentColor" strokeWidth="1.5"/></svg>
                      </button>
                    )}
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #222', marginTop: 4, paddingTop: 4 }}>
                  <button
                    onClick={() => { s.addInvestigation(); s.setInvestigationMenuOpen(false); }}
                    style={{ width: '100%', padding: '6px 12px', textAlign: 'left', fontSize: 12, color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#222'; (e.currentTarget as HTMLElement).style.color = '#ccc'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#666'; }}
                  >
                    + New Investigation
                  </button>
                  {s.investigations.length > 1 && (
                    <button
                      onClick={() => { if (confirm('Combine all investigations onto one canvas?')) { s.combineInvestigations(); s.setInvestigationMenuOpen(false); } }}
                      style={{ width: '100%', padding: '6px 12px', textAlign: 'left', fontSize: 12, color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#222'; (e.currentTarget as HTMLElement).style.color = '#ccc'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#666'; }}
                    >
                      Combine All
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="tb-sep" />

        {/* Card buttons */}
        <div className="flex items-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {cards.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => s.addCard(type as CardType)}
              className="tb-btn"
              title={label}
              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: '0.04em' }}
            >
              {icon}
            </button>
          ))}
          <button
            onClick={() => s.setCustomUrlModalOpen(true)}
            className="tb-btn"
            title="Custom URL"
            style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }}
          >
            URL
          </button>
        </div>

        <div className="tb-sep" />

        {/* API option */}
        <button
          onClick={() => s.setApiWorkspaceOpen(!s.apiWorkspaceOpen)}
          className={`tb-btn ${s.apiWorkspaceOpen ? 'active' : ''}`}
          title="API Workspace"
          style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.04em' }}
        >
          API
        </button>

        <div className="tb-sep" />

        {/* Line style */}
        <div className="relative">
          <button onClick={() => setShowLineMenu(!showLineMenu)} className="tb-btn" title="Line style">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <line x1="1" y1="15" x2="15" y2="1" stroke={s.defaultEdgeColor} strokeWidth={Math.min(s.defaultStrokeWidth, 2.5)}
                strokeDasharray={s.defaultLineStyle === 'dashed' ? '4 2' : s.defaultLineStyle === 'dotted' ? '2 2' : '0'} />
            </svg>
          </button>
          {showLineMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowLineMenu(false)} />
              <div className="absolute left-0 top-full mt-1 z-50 animate-fade-in"
                style={{ width: 200, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 7, boxShadow: '0 8px 24px rgba(0,0,0,0.6)', padding: 12 }}>
                <p style={{ fontSize: 10, color: '#555', marginBottom: 8, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em' }}>COLOR</p>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                  {QUICK_COLORS.map((c) => (
                    <button key={c} onClick={() => s.setDefaultEdgeColor(c)}
                      style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: s.defaultEdgeColor === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', transition: 'transform 0.1s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    />
                  ))}
                  <input type="color" value={s.defaultEdgeColor} onChange={(e) => s.setDefaultEdgeColor(e.target.value)}
                    style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid #333', cursor: 'pointer', padding: 0 }} />
                </div>
                <p style={{ fontSize: 10, color: '#555', marginBottom: 6, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em' }}>PATTERN</p>
                <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                  {(['solid','dashed','dotted'] as LineStyle[]).map((l) => (
                    <button key={l} onClick={() => s.setDefaultLineStyle(l)}
                      style={{ flex: 1, padding: '4px 0', borderRadius: 4, border: `1px solid ${s.defaultLineStyle === l ? '#555' : '#2a2a2a'}`,
                        background: s.defaultLineStyle === l ? '#2a2a2a' : '#161616', fontSize: 10, color: s.defaultLineStyle === l ? '#ccc' : '#555', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {l}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 10, color: '#555', marginBottom: 6, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em' }}>WEIGHT</p>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1,2,3,4].map((w) => (
                    <button key={w} onClick={() => s.setDefaultStrokeWidth(w)}
                      style={{ flex: 1, padding: '6px 0', borderRadius: 4, border: `1px solid ${s.defaultStrokeWidth === w ? '#555' : '#2a2a2a'}`,
                        background: s.defaultStrokeWidth === w ? '#2a2a2a' : '#161616', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 16, height: Math.max(w, 1), background: s.defaultEdgeColor, borderRadius: 1 }} />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Dot grid toggle */}
        <button
          onClick={() => s.setShowDots(!s.showDots)}
          className={`tb-btn ${s.showDots ? 'active' : ''}`}
          title="Toggle grid dots"
          style={{ fontSize: 14, lineHeight: 1 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style={{ opacity: s.showDots ? 0.9 : 0.3 }}>
            <circle cx="2" cy="2" r="1.2"/><circle cx="7" cy="2" r="1.2"/><circle cx="12" cy="2" r="1.2"/>
            <circle cx="2" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/><circle cx="12" cy="7" r="1.2"/>
            <circle cx="2" cy="12" r="1.2"/><circle cx="7" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/>
          </svg>
        </button>

        {/* AI toggle */}
        <button
          onClick={() => s.setAiPanelOpen(!s.aiPanelOpen)}
          className={`tb-btn ${s.aiPanelOpen ? 'active' : ''}`}
          title="AI File Analysis"
          style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.04em' }}
        >
          AI
        </button>

        <div style={{ flex: 1 }} />

        {/* Stats */}
        <div style={{ fontSize: 10, color: '#444', fontFamily: 'IBM Plex Mono, monospace', display: 'flex', gap: 12, marginRight: 8 }} className="hidden md:flex">
          <span>{s.nodes.length} nodes</span>
          <span>{s.edges.length} edges</span>
          <span>{s.investigations.length} inv</span>
        </div>

        {/* Undo */}
        <button
          onClick={() => s.undo()}
          className="tb-btn"
          title="Undo (Ctrl+Z)"
          style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 6C2 3.8 3.8 2 6 2C8.2 2 10 3.8 10 6C10 8.2 8.2 10 6 10"/>
            <path d="M2 6L4 4M2 6L4 8"/>
          </svg>
        </button>

        {/* Menu */}
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="tb-btn" title="More">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="7" cy="2" r="1.2"/><circle cx="7" cy="7" r="1.2"/><circle cx="7" cy="12" r="1.2"/>
            </svg>
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 animate-fade-in"
                style={{ width: 200, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 7, boxShadow: '0 8px 24px rgba(0,0,0,0.6)', padding: '4px 0' }}>
                {[
                  { label: 'Export', action: () => { s.setExportModalOpen(true); setShowMenu(false); } },
                  { label: 'Import', action: () => { s.setImportModalOpen(true); setShowMenu(false); } },
                  { label: 'Ollama Settings', action: () => { s.setApiSettingsOpen(true); setShowMenu(false); } },
                ].map(({ label, action }) => (
                  <button key={label} onClick={action}
                    style={{ width: '100%', padding: '7px 12px', textAlign: 'left', fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#222'; (e.currentTarget as HTMLElement).style.color = '#e0e0e0'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#888'; }}
                  >
                    {label}
                  </button>
                ))}
                <div style={{ borderTop: '1px solid #222', margin: '4px 0' }} />
                <button
                  onClick={() => { if (confirm('Clear the current workspace?')) { s.clearWorkspace(); setShowMenu(false); } }}
                  style={{ width: '100%', padding: '7px 12px', textAlign: 'left', fontSize: 12, color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#2a1a1a'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#666'; }}
                >
                  Clear Workspace
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
