import React, { useState, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { startAiWorkflowExecution, stopAiWorkflowExecution } from '../services/aiWorkflowRunner';
import type { CardType, LineStyle } from '../types';
import { clearAllLocalData } from '../utils/fileSystem';
import { apiService } from '../services/api';

const QUICK_COLORS = ['#888888','#e0e0e0','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899'];

const NORMAL_WORKFLOW_CATEGORIES = [
  {
    name: 'Data',
    color: '#3b82f6',
    items: [
      { type: 'import-card' as CardType, label: 'Import Data' },
      { type: 'transform' as CardType, label: 'Transform' },
      { type: 'merge' as CardType, label: 'Merge' },
    ],
  },
  {
    name: 'Network',
    color: '#f97316',
    items: [
      { type: 'http-request' as CardType, label: 'HTTP Request' },
      { type: 'webhook' as CardType, label: 'Webhook' },
    ],
  },
  {
    name: 'Logic',
    color: '#a855f7',
    items: [
      { type: 'condition' as CardType, label: 'Condition' },
      { type: 'loop' as CardType, label: 'Loop' },
      { type: 'code-exec' as CardType, label: 'Code Execution' },
      { type: 'delay' as CardType, label: 'Delay' },
      { type: 'trigger' as CardType, label: 'Trigger' },
    ],
  },
  {
    name: 'OSINT',
    color: '#22c55e',
    items: [
      { type: 'osint-whois' as CardType, label: 'WHOIS' },
      { type: 'osint-dns' as CardType, label: 'DNS' },
      { type: 'osint-subdomain' as CardType, label: 'Subdomain Enum' },
      { type: 'osint-ip' as CardType, label: 'IP Lookup' },
      { type: 'osint-email' as CardType, label: 'Email Lookup' },
      { type: 'osint-portscan' as CardType, label: 'Port Scan' },
    ],
  },
];

export const Toolbar: React.FC = () => {
  const s = useWorkspaceStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showLineMenu, setShowLineMenu] = useState(false);
  const [showWorkflowMenu, setShowWorkflowMenu] = useState(false);
  const [editingInvId, setEditingInvId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [runStatus, setRunStatus] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingInvId && editRef.current) editRef.current.focus();
  }, [editingInvId]);

  const activeInv = s.investigations.find((i) => i.id === s.activeInvestigationId);
  const isAiWorkspace = activeInv?.isAiAnalysis || false;
  const isRunning = s.isExecuting;
  const currentExecutionMode = s.executionId?.startsWith('local-') ? 'Local mode' : s.executionId ? 'Backend mode' : 'Idle';
  const selectedCardCount = isAiWorkspace ? 0 : s.nodes.filter((node) => node.selected).length;
  const activeSwarmNode = isAiWorkspace
    ? s.nodes.find((node) => node.selected && node.data.cardType === 'agent-group')
      || s.nodes.find((node) => node.data.cardType === 'agent-group')
    : null;
  const activeSwarmAgentsCount = activeSwarmNode?.data.agentGroupAgents?.length || 0;
  const savedLabel = s.lastSavedAt
    ? `Saved ${new Date(s.lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Not saved yet';
  const clearWorkspaceLabel = isAiWorkspace ? 'Reset AI Workflow' : 'Clear Workspace';

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

  const handleRun = async () => {
    if (isRunning) {
      await stopAiWorkflowExecution();
      setRunStatus('');
      return;
    }

    setRunStatus('Running...');

    try {
      const mode = await startAiWorkflowExecution();
      if (mode === 'backend') {
        setRunStatus('Backend mode');
      } else if (mode === 'local') {
        setRunStatus('Local mode');
      } else {
        setRunStatus('Idle');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRunStatus(`Error: ${msg}`);
    }

    setTimeout(() => {
      if (!useWorkspaceStore.getState().isExecuting) {
        setRunStatus('');
      }
    }, 5000);
  };

  // ─── NORMAL WORKSPACE TOOLBAR ──────────────────────────────────────────
  const renderNormalToolbar = () => (
    <>
      {/* Quick cards for normal workspace */}
      <div className="flex items-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {[
          { type: 'title-card' as CardType, label: 'Title', icon: 'T', color: '#9a9af0' },
          { type: 'note' as CardType, label: 'Note', icon: 'N', color: undefined },
          { type: 'image' as CardType, label: 'Image', icon: 'Img', color: undefined },
          { type: 'pdf' as CardType, label: 'PDF', icon: 'PDF', color: undefined },
          { type: 'whois' as CardType, label: 'WHOIS', icon: 'WH', color: undefined },
          { type: 'dns' as CardType, label: 'DNS', icon: 'DNS', color: undefined },
          { type: 'custom-url' as CardType, label: 'URL', icon: 'URL', color: undefined },
        ].map(({ type, label, icon, color }) => (
          <button key={type} onClick={() => s.addCard(type)} className="tb-btn" title={label}
            style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: '0.04em', color }}>
            {icon}
          </button>
        ))}
      </div>

      <div className="tb-sep" />

      {/* Workflow dropdown */}
      <div className="relative">
        <button onClick={() => setShowWorkflowMenu(!showWorkflowMenu)}
          className={`tb-btn ${showWorkflowMenu ? 'active' : ''}`} title="Workflow Nodes"
          style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.04em', color: showWorkflowMenu ? '#22c55e' : '#888' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="0.5" y="0.5" width="4" height="4" rx="1"/><rect x="7.5" y="0.5" width="4" height="4" rx="1"/>
            <rect x="0.5" y="7.5" width="4" height="4" rx="1"/><rect x="7.5" y="7.5" width="4" height="4" rx="1"/>
            <line x1="4.5" y1="2.5" x2="7.5" y2="2.5"/><line x1="2.5" y1="4.5" x2="2.5" y2="7.5"/>
            <line x1="9.5" y1="4.5" x2="9.5" y2="7.5"/><line x1="4.5" y1="9.5" x2="7.5" y2="9.5"/>
          </svg>
          WORKFLOW
        </button>
        {showWorkflowMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowWorkflowMenu(false)} />
            <div className="absolute left-0 top-full mt-1 z-50 animate-fade-in"
              style={{ width: 480, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 7, boxShadow: '0 8px 24px rgba(0,0,0,0.6)', padding: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {NORMAL_WORKFLOW_CATEGORIES.map(cat => (
                  <div key={cat.name}>
                    <p style={{ fontSize: 8, color: cat.color, fontFamily: 'IBM Plex Mono', letterSpacing: '0.08em', marginBottom: 4, fontWeight: 600 }}>
                      {cat.name.toUpperCase()}
                    </p>
                    {cat.items.map(item => (
                      <button key={item.type}
                        onClick={() => { s.addCard(item.type); setShowWorkflowMenu(false); }}
                        style={{ width: '100%', padding: '5px 6px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#888', borderRadius: 4, fontFamily: 'IBM Plex Sans', display: 'block' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#222'; (e.currentTarget as HTMLElement).style.color = cat.color; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#888'; }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="tb-sep" />

      <button
        onClick={() => s.importSelectedNodesToAiWorkspace()}
        disabled={selectedCardCount === 0}
        className="tb-btn"
        title={selectedCardCount > 0 ? 'Send selected cards to the AI investigation workspace' : 'Select one or more cards first'}
        style={{
          fontSize: 10,
          fontFamily: 'IBM Plex Mono, monospace',
          letterSpacing: '0.04em',
          color: selectedCardCount > 0 ? '#7ab3e8' : '#555',
          opacity: selectedCardCount > 0 ? 1 : 0.55,
        }}
      >
        TO AI
        <span style={{ fontSize: 8, color: selectedCardCount > 0 ? '#7ab3e8' : '#555', marginLeft: 4 }}>
          {selectedCardCount}
        </span>
      </button>

      <div className="tb-sep" />

      {/* Line style - only in normal workspace */}
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
              <p style={{ fontSize: 10, color: '#555', marginBottom: 8, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em' }}>COLOR</p>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                {QUICK_COLORS.map((c) => (
                  <button key={c} onClick={() => s.setDefaultEdgeColor(c)}
                    style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: s.defaultEdgeColor === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', transition: 'transform 0.1s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')} />
                ))}
                <input type="color" value={s.defaultEdgeColor} onChange={(e) => s.setDefaultEdgeColor(e.target.value)}
                  style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid #333', cursor: 'pointer', padding: 0 }} />
              </div>
              <p style={{ fontSize: 10, color: '#555', marginBottom: 6, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em' }}>PATTERN</p>
              <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                {(['solid','dashed','dotted'] as LineStyle[]).map((l) => (
                  <button key={l} onClick={() => s.setDefaultLineStyle(l)}
                    style={{ flex: 1, padding: '4px 0', borderRadius: 4, border: `1px solid ${s.defaultLineStyle === l ? '#555' : '#2a2a2a'}`,
                      background: s.defaultLineStyle === l ? '#2a2a2a' : '#161616', fontSize: 10, color: s.defaultLineStyle === l ? '#ccc' : '#555', cursor: 'pointer', fontFamily: 'IBM Plex Mono' }}>
                    {l}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 10, color: '#555', marginBottom: 6, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em' }}>WEIGHT</p>
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
    </>
  );

  // ─── AI WORKSPACE TOOLBAR ──────────────────────────────────────────────
  const renderAiToolbar = () => (
    <>
      {/* Investigation workspace controls */}
      <div className="flex items-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {[
          { type: 'import-card' as CardType, label: 'Data Card', icon: 'DATA', color: '#22c55e' },
          { type: 'question-card' as CardType, label: 'Question Card', icon: 'ASK', color: '#d4a800' },
        ].map(({ type, label, icon, color }) => (
          <button key={type} onClick={() => s.addCard(type)} className="tb-btn" title={label}
            style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: '0.04em', color }}>
            {icon}
          </button>
        ))}

        <button
          onClick={() => s.setAgentSidebarOpen(!s.agentSidebarOpen)}
          className={`tb-btn ${s.agentSidebarOpen ? 'active' : ''}`}
          title="Open the investigation agent library"
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            letterSpacing: '0.04em',
            color: s.agentSidebarOpen ? '#7ab3e8' : '#9a9af0',
          }}
        >
          AGENTS
          <span style={{ fontSize: 8, marginLeft: 4, color: s.agentSidebarOpen ? '#7ab3e8' : '#666' }}>
            {activeSwarmAgentsCount}
          </span>
        </button>
      </div>

      <div className="tb-sep" />

      <span
        title="The AI workspace already includes the full investigation pipeline"
        style={{
          fontSize: 8,
          fontFamily: 'IBM Plex Mono, monospace',
          letterSpacing: '0.05em',
          padding: '2px 6px',
          borderRadius: 4,
          border: '1px solid #1f3246',
          background: '#0f1b2a',
          color: '#7ab3e8',
        }}
      >
        PREBUILT FLOW
      </span>

      <div className="tb-sep" />

      {/* Run for AI workspace */}
      <button onClick={handleRun} className="tb-btn"
        title={isRunning ? 'Stop execution' : 'Run agents'}
        style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.04em', color: isRunning ? '#ef4444' : '#22c55e' }}>
        {isRunning
          ? <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="8" height="8" rx="1" /></svg>
          : <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polygon points="1,0 10,5 1,10" /></svg>}
        {isRunning ? 'STOP' : 'RUN'}
        {runStatus && <span style={{ fontSize: 8, color: '#666', marginLeft: 4 }}>{runStatus}</span>}
      </button>

      <span
        title="Current execution engine mode"
        style={{
          fontSize: 8,
          fontFamily: 'IBM Plex Mono, monospace',
          letterSpacing: '0.05em',
          padding: '2px 6px',
          borderRadius: 4,
          border: '1px solid #2a2a2a',
          background: currentExecutionMode === 'Backend mode' ? '#0f1b2a' : currentExecutionMode === 'Local mode' ? '#1d1a10' : '#151515',
          color: currentExecutionMode === 'Backend mode' ? '#7ab3e8' : currentExecutionMode === 'Local mode' ? '#d8b46a' : '#666',
        }}
      >
        {currentExecutionMode}
      </span>
      {/* NO line style in AI workspace */}
    </>
  );

  return (
    <div className="fixed top-0 left-0 right-0 z-40" style={{ background: '#161616', borderBottom: '1px solid #222' }}>
      <div className="flex items-center h-11 px-3 gap-1">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-3">
          <div
            style={{
              width: 26,
              height: 26,
              background: '#1e1e1e',
              border: '1px solid #2a2a2a',
              borderRadius: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d9b97b',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'IBM Plex Mono, monospace',
              letterSpacing: '0.02em',
            }}
            aria-label="Mipler mark"
          >
            M
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#888', letterSpacing: '0.08em', fontFamily: 'IBM Plex Mono, monospace' }} className="hidden sm:inline">MIPLER</span>
        </div>

        {/* Investigation picker */}
        <div className="relative">
          <button onClick={() => s.setInvestigationMenuOpen(!s.investigationMenuOpen)} className="tb-btn"
            style={{ color: '#ccc', fontWeight: 500, fontSize: 12 }}>
            <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
              {activeInv?.name || 'Untitled'}
              {isAiWorkspace && (
                <span style={{ fontSize: 8, marginLeft: 4, padding: '1px 4px', background: '#0a1a0a', color: '#3a8a3a', border: '1px solid #1a3a1a', borderRadius: 3, fontFamily: 'IBM Plex Mono' }}>AI</span>
              )}
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
                      <input ref={editRef} value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingInvId(null); }}
                        style={{ flex: 1, background: '#111', border: '1px solid #444', borderRadius: 4, padding: '2px 6px', fontSize: 12, color: '#e0e0e0', outline: 'none', fontFamily: 'inherit' }}
                        onClick={(e) => e.stopPropagation()} />
                    ) : (
                      <button
                        onClick={() => { s.switchInvestigation(inv.id); s.setInvestigationMenuOpen(false); }}
                        style={{ flex: 1, textAlign: 'left', fontSize: 12, color: inv.id === s.activeInvestigationId ? '#e0e0e0' : '#888', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {inv.name}
                        {inv.isAiAnalysis && (
                          <span style={{ fontSize: 7, padding: '0 3px', background: '#0a1a0a', color: '#3a8a3a', border: '1px solid #1a3a1a', borderRadius: 2, fontFamily: 'IBM Plex Mono' }}>AI</span>
                        )}
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); startRename(inv.id, inv.name); }}
                      style={{ padding: '2px 4px', fontSize: 10, color: '#555', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 3, flexShrink: 0 }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#aaa')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#555')} title="Rename">
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor"><path d="M7.5 1.5L9.5 3.5L3.5 9.5L1 10L1.5 7.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1" fill="none"/></svg>
                    </button>
                    {s.investigations.length > 1 && (
                      <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${inv.name}"?`)) s.removeInvestigation(inv.id); }}
                        style={{ padding: '2px 4px', fontSize: 10, color: '#555', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 3, flexShrink: 0 }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#555')} title="Delete">
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor"><line x1="1" y1="1" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5"/><line x1="8" y1="1" x2="1" y2="8" stroke="currentColor" strokeWidth="1.5"/></svg>
                      </button>
                    )}
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #222', marginTop: 4, paddingTop: 4 }}>
                  <button onClick={() => { s.addInvestigation(); s.setInvestigationMenuOpen(false); }}
                    style={{ width: '100%', padding: '6px 12px', textAlign: 'left', fontSize: 12, color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#222'; (e.currentTarget as HTMLElement).style.color = '#ccc'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#666'; }}>
                    + New Investigation
                  </button>
                  {s.investigations.length > 1 && (
                    <button onClick={() => { s.setCombineModalOpen(true); s.setInvestigationMenuOpen(false); }}
                      style={{ width: '100%', padding: '6px 12px', textAlign: 'left', fontSize: 12, color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#222'; (e.currentTarget as HTMLElement).style.color = '#ccc'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#666'; }}>
                      Combine Workspaces
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="tb-sep" />

        {/* Render the appropriate toolbar based on workspace type */}
        {isAiWorkspace ? renderAiToolbar() : renderNormalToolbar()}

        {/* Dot grid toggle */}
        <button onClick={() => s.setShowDots(!s.showDots)}
          className={`tb-btn ${s.showDots ? 'active' : ''}`} title="Toggle grid dots"
          style={{ fontSize: 14, lineHeight: 1 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style={{ opacity: s.showDots ? 0.9 : 0.3 }}>
            <circle cx="2" cy="2" r="1.2"/><circle cx="7" cy="2" r="1.2"/><circle cx="12" cy="2" r="1.2"/>
            <circle cx="2" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/><circle cx="12" cy="7" r="1.2"/>
            <circle cx="2" cy="12" r="1.2"/><circle cx="7" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/>
          </svg>
        </button>

        <div style={{ flex: 1 }} />

        {/* Stats */}
        <div style={{ fontSize: 10, color: '#444', fontFamily: 'IBM Plex Mono, monospace', display: 'flex', gap: 12, marginRight: 8 }} className="hidden md:flex">
          <span>{s.nodes.length} nodes</span>
          <span>{s.edges.length} edges</span>
          <span>{savedLabel}</span>
        </div>

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
                  { label: 'Import Workspace', action: () => { s.setImportModalOpen(true); setShowMenu(false); } },
                  { label: 'Save to Local Storage', action: () => { s.saveToLocalFile(); setShowMenu(false); } },
                  { label: 'Assistant Settings', action: () => { s.setApiSettingsOpen(true); setShowMenu(false); } },
                ].map(({ label, action }) => (
                  <button key={label} onClick={action}
                    style={{ width: '100%', padding: '7px 12px', textAlign: 'left', fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#222'; (e.currentTarget as HTMLElement).style.color = '#e0e0e0'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#888'; }}>
                    {label}
                  </button>
                ))}
                <div style={{ borderTop: '1px solid #222', margin: '4px 0' }} />
                <button onClick={() => { if (confirm(isAiWorkspace ? 'Reset the AI investigation workflow to the default connected cards?' : 'Clear the current workspace?')) { s.clearWorkspace(); setShowMenu(false); } }}
                  style={{ width: '100%', padding: '7px 12px', textAlign: 'left', fontSize: 12, color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#2a1a1a'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#666'; }}>
                  {clearWorkspaceLabel}
                </button>
                <button
                  onClick={async () => {
                    const ok = confirm('Factory reset will remove local browser data and backend assistant memory, skills, schedules, and saved secrets. Continue?');
                    if (!ok) return;

                    clearAllLocalData();
                    try {
                      await apiService.factoryReset();
                    } catch {
                      // Keep local reset even when backend is offline.
                    }

                    s.clearWorkspace();
                    s.clearAiChat();
                    s.setShowDots(true);
                    setShowMenu(false);
                    window.location.reload();
                  }}
                  style={{ width: '100%', padding: '7px 12px', textAlign: 'left', fontSize: 12, color: '#9b6a6a', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#351919'; (e.currentTarget as HTMLElement).style.color = '#ff8080'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#9b6a6a'; }}
                >
                  Factory Reset (Fresh Start)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
