import React, { useState, useRef, useCallback } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { analyzeFilesWithAi, readFileForAnalysis } from '../utils/aiApi';
import { spawnMindmapOnCanvas } from '../store/useWorkspaceStore';
import { uploadJsonFile } from '../utils/fileSystem';
import type { UploadedFile, MindmapNode, MindmapResult } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Mini mindmap preview (collapsible tree — for the panel sidebar only)
// ─────────────────────────────────────────────────────────────────────────────
const MiniNodeView: React.FC<{ node: MindmapNode; depth: number }> = ({ node, depth }) => {
  const [collapsed, setCollapsed] = useState(false);
  const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#06b6d4', '#eab308'];
  const col = COLORS[depth % COLORS.length];
  return (
    <div style={{ marginLeft: depth * 14, marginTop: 3 }}>
      <div
        onClick={() => node.children.length > 0 && setCollapsed(!collapsed)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '2px 7px', borderRadius: 4,
          background: depth === 0 ? col + '18' : 'transparent',
          border: `1px solid ${col}33`,
          cursor: node.children.length > 0 ? 'pointer' : 'default',
          fontSize: 10, color: '#bbb', fontFamily: 'IBM Plex Sans',
          maxWidth: 290,
        }}
      >
        {node.children.length > 0 && (
          <span style={{ color: col, fontSize: 8, flexShrink: 0 }}>{collapsed ? '▶' : '▼'}</span>
        )}
        <span style={{ wordBreak: 'break-word' }}>{node.label}</span>
        {node.children.length > 0 && (
          <span style={{ fontSize: 8, color: '#444', flexShrink: 0 }}>({node.children.length})</span>
        )}
      </div>
      {!collapsed && node.children.map(c => (
        <MiniNodeView key={c.id} node={c} depth={depth + 1} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Count all nodes in tree
// ─────────────────────────────────────────────────────────────────────────────
function countNodes(nodes: MindmapNode[]): number {
  return nodes.reduce((acc, n) => acc + 1 + countNodes(n.children), 0);
}

function getMindmapDepth(nodes: MindmapNode[]): number {
  if (nodes.length === 0) return 0;
  return nodes.reduce((maxDepth, node) => Math.max(maxDepth, 1 + getMindmapDepth(node.children)), 0);
}

const InsightSection: React.FC<{ title: string; items: string[]; accent: string }> = ({ title, items, accent }) => {
  if (items.length === 0) return null;

  return (
    <div>
      <p style={{ fontSize: 9, color: '#555', marginBottom: 6, fontFamily: 'IBM Plex Mono', letterSpacing: '0.07em' }}>
        {title.toUpperCase()}
      </p>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '10px',
        background: '#101010',
        border: '1px solid #1e1e1e',
        borderRadius: 6,
      }}>
        {items.map((item, index) => (
          <div key={`${title}-${index}`} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: accent, fontSize: 11, lineHeight: 1.5 }}>•</span>
            <span style={{ fontSize: 11, color: '#b8b8b8', lineHeight: 1.6 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// File type badge label
// ─────────────────────────────────────────────────────────────────────────────
function fileBadge(type: string): string {
  if (type === 'json') return 'JSON';
  if (type === 'pdf') return 'PDF';
  if (type === 'image') return 'IMG';
  if (type === 'csv') return 'CSV';
  if (['txt', 'md', 'log'].includes(type)) return 'TXT';
  if (['xml', 'html', 'yaml', 'yml'].includes(type)) return type.toUpperCase();
  return 'FILE';
}

// ─────────────────────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────────────────────
const Step: React.FC<{ n: number; label: string; active: boolean; done: boolean }> = ({ n, label, active, done }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <div style={{
      width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: done ? '#1a3a2a' : active ? '#1a2a3a' : '#1a1a1a',
      border: `1px solid ${done ? '#2a6a3a' : active ? '#2a4a6a' : '#2a2a2a'}`,
      fontSize: 9, color: done ? '#4a9a5a' : active ? '#4a7abf' : '#444',
      fontFamily: 'IBM Plex Mono', fontWeight: 600, flexShrink: 0,
    }}>
      {done ? '✓' : n}
    </div>
    <span style={{ fontSize: 10, color: done ? '#4a7a5a' : active ? '#7ab3f0' : '#444', fontFamily: 'IBM Plex Sans' }}>
      {label}
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Panel
// ─────────────────────────────────────────────────────────────────────────────
export const FileAnalysisPanel: React.FC = () => {
  const { setAiPanelOpen, llmBaseUrl, llmModel } = useWorkspaceStore();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState<MindmapResult | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [spawned, setSpawned] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Steps state ──────────────────────────────────────────────────────────
  const step1Done = files.length > 0;
  const step2Done = step1Done && question.trim().length > 0;
  const step3Done = !!result;

  const addFiles = useCallback(async (incoming: FileList | null) => {
    if (!incoming) return;
    setError('');
    setResult(null);
    setSpawned(false);
    const added: UploadedFile[] = [];
    for (const file of Array.from(incoming)) {
      try {
        added.push(await readFileForAnalysis(file));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    setFiles(prev => [...prev, ...added]);
  }, []);

  // ── Import mindmap JSON directly onto canvas ─────────────────────────────
  const importMindmapJson = async () => {
    setError('');
    try {
      const imported = await uploadJsonFile();
      if (!imported) return;

      if (imported.type === 'mindmap') {
        spawnMindmapOnCanvas(imported.data as MindmapResult);
        setError('');
        // Show a success flash
        setLoadingStep('✓ Mindmap imported onto canvas!');
        setTimeout(() => setLoadingStep(''), 2500);
      } else if (imported.type === 'workspace') {
        setError('This looks like a workspace file — use Import in the menu (⋮) instead.');
      } else {
        setError('This JSON is not a recognised Mipler mindmap export. Make sure you export from the AI Analysis panel.');
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setResult(null);
    setSpawned(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  // ── Analyse ──────────────────────────────────────────────────────────────
  const analyze = async () => {
    if (!question.trim()) { setError('Please write a question first.'); return; }
    if (files.length === 0) { setError('Please upload at least one file.'); return; }
    setError('');
    setLoading(true);
    setSpawned(false);
    setResult(null);

    try {
      setLoadingStep('Sending files to Ollama…');
      const analysisFiles = files.map(f => ({ name: f.name, type: f.type, data: f.data }));
      setLoadingStep('AI is reading evidence and tracing leads…');
      const res = await analyzeFilesWithAi(question, analysisFiles, llmBaseUrl, llmModel);
      setLoadingStep('Structuring the investigation map…');
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }

    setLoading(false);
    setLoadingStep('');
  };

  // ── Spawn mindmap cards on canvas ────────────────────────────────────────
  const spawnOnCanvas = () => {
    if (!result) return;
    spawnMindmapOnCanvas(result);
    setSpawned(true);
  };

  // ── Download mindmap JSON ────────────────────────────────────────────────
  const downloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mipler-mindmap-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const nodeCount = result ? countNodes(result.mindmap.nodes) : 0;
  const depthCount = result ? getMindmapDepth(result.mindmap.nodes) : 0;
  const confidence = result?.confidence !== undefined ? `${Math.round(result.confidence * 100)}%` : 'n/a';
  const leadItems = (result?.leads || []).map((lead) =>
    `${lead.priority.toUpperCase()}: ${lead.title}${lead.detail ? ` — ${lead.detail}` : ''}`,
  );
  const entityItems = (result?.entities || []).map((entity) =>
    `${entity.name}${entity.type ? ` (${entity.type})` : ''}${entity.relevance ? ` — ${entity.relevance}` : ''}`,
  );
  const riskItems = result?.risks || [];
  const nextQuestionItems = result?.nextQuestions || [];
  const timelineItems = (result?.timeline || []).map((event) =>
    `${event.date ? `${event.date}: ` : ''}${event.detail}`,
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: 370,
      height: '100%',
      background: '#141414',
      borderLeft: '1px solid #222',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      fontFamily: 'IBM Plex Sans, sans-serif',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', height: 40, borderBottom: '1px solid #222',
        background: '#181818', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#ddd', letterSpacing: '0.02em' }}>AI File Analysis</span>
          <span style={{
            fontSize: 8, padding: '1px 5px', background: '#0a1a0a',
            color: '#3a8a3a', border: '1px solid #1a3a1a', borderRadius: 3,
            fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em',
          }}>OLLAMA</span>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {/* Import mindmap JSON button */}
          <button
            onClick={importMindmapJson}
            title="Import a previously exported Mipler mindmap JSON onto the canvas"
            style={{
              padding: '3px 8px', background: '#1a2a1a', border: '1px solid #2a4a2a',
              borderRadius: 4, fontSize: 9, color: '#4a8a4a', cursor: 'pointer',
              fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#7acc7a')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4a8a4a')}
          >
            ↑ Import JSON
          </button>
          <button onClick={() => setAiPanelOpen(false)}
            style={{ padding: '3px 6px', color: '#444', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 3 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ccc')}
            onMouseLeave={e => (e.currentTarget.style.color = '#444')}>
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="8" y2="8" /><line x1="8" y1="1" x2="1" y2="8" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Steps progress ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 12, padding: '8px 14px',
        borderBottom: '1px solid #1e1e1e', background: '#111', flexShrink: 0,
      }}>
        <Step n={1} label="Upload files" active={!step1Done} done={step1Done} />
        <Step n={2} label="Ask a question" active={step1Done && !step2Done} done={step2Done} />
        <Step n={3} label="Analyse" active={step2Done && !step3Done} done={step3Done} />
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Drop zone ─────────────────────────────────────────────────── */}
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#3b82f6' : files.length > 0 ? '#2a4a2a' : '#252525'}`,
              borderRadius: 8, padding: '14px 12px',
              textAlign: 'center', cursor: 'pointer',
              background: dragging ? '#0a1220' : files.length > 0 ? '#0a140a' : '#0f0f0f',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 4, opacity: 0.4 }}>📂</div>
            <p style={{ fontSize: 11, color: files.length > 0 ? '#4a8a4a' : '#444', marginBottom: 3 }}>
              {files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''} loaded — drop more or click` : 'Drop files here or click to browse'}
            </p>
            <p style={{ fontSize: 9, color: '#333', fontFamily: 'IBM Plex Mono' }}>
              JSON · CSV · TXT · PDF · images · XML · YAML · any file
            </p>
            <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
          </div>
        </div>

        {/* ── Uploaded files list ───────────────────────────────────────── */}
        {files.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontSize: 9, color: '#555', fontFamily: 'IBM Plex Mono', letterSpacing: '0.07em' }}>
                UPLOADED FILES
              </p>
              <button onClick={() => { setFiles([]); setResult(null); setSpawned(false); }}
                style={{ fontSize: 9, color: '#444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'IBM Plex Mono' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={e => (e.currentTarget.style.color = '#444')}>
                clear all
              </button>
            </div>
            {files.map(f => (
              <div key={f.id} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '5px 8px', background: '#181818',
                border: '1px solid #202020', borderRadius: 5, marginBottom: 4,
              }}>
                <span style={{
                  fontSize: 8, padding: '1px 4px', background: '#222', color: '#666',
                  borderRadius: 3, fontFamily: 'IBM Plex Mono', flexShrink: 0,
                }}>
                  {fileBadge(f.type)}
                </span>
                <span style={{ flex: 1, fontSize: 11, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name}
                </span>
                <span style={{ fontSize: 9, color: '#383838', fontFamily: 'IBM Plex Mono', flexShrink: 0 }}>
                  {(f.size / 1024).toFixed(1)}k
                </span>
                <button onClick={() => removeFile(f.id)}
                  style={{ padding: '2px 3px', color: '#383838', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 3, flexShrink: 0, lineHeight: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#383838')}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Question ─────────────────────────────────────────────────── */}
        <div>
          <p style={{ fontSize: 9, color: '#555', marginBottom: 6, fontFamily: 'IBM Plex Mono', letterSpacing: '0.07em' }}>
            YOUR QUESTION
          </p>
          <textarea
            value={question}
            onChange={e => { setQuestion(e.target.value); setResult(null); setSpawned(false); }}
            placeholder={
              files.length === 0
                ? 'Upload files first, then write your question here…'
                : 'What do you want to know? e.g.:\n• "Summarise the key findings"\n• "Who are the main entities?"\n• "What security risks are present?"'
            }
            rows={4}
            style={{
              width: '100%', padding: '8px 10px', background: '#111',
              border: `1px solid ${question.trim() ? '#2a4a2a' : '#222'}`,
              borderRadius: 6, fontSize: 11, color: '#ccc', outline: 'none',
              fontFamily: 'IBM Plex Sans', resize: 'vertical',
              boxSizing: 'border-box' as const, lineHeight: 1.6,
              transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#2a4a6a')}
            onBlur={e => (e.currentTarget.style.borderColor = question.trim() ? '#2a4a2a' : '#222')}
          />

          {/* Quick question chips */}
          {files.length > 0 && !question.trim() && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {[
                'Summarise the key findings',
                'Who are the main entities?',
                'What are the security risks?',
                'What patterns do you see?',
              ].map(q => (
                <button key={q} onClick={() => setQuestion(q)}
                  style={{
                    padding: '3px 8px', background: '#181818', border: '1px solid #282828',
                    borderRadius: 10, fontSize: 10, color: '#555', cursor: 'pointer',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#aaa'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#3a3a3a'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#555'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#282828'; }}>
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <div style={{ padding: '8px 10px', background: '#1e0a0a', border: '1px solid #4a1a1a', borderRadius: 5, fontSize: 11, color: '#cc5555', lineHeight: 1.5 }}>
            ⚠ {error}
          </div>
        )}

        {/* ── Loading step flash ───────────────────────────────────────── */}
        {loadingStep && !error && (
          <div style={{ padding: '7px 10px', background: '#0a1520', border: '1px solid #1a3a5a', borderRadius: 5, fontSize: 11, color: '#4a8abf', fontFamily: 'IBM Plex Mono' }}>
            {loadingStep}
          </div>
        )}

        {/* ── Analyse button ───────────────────────────────────────────── */}
        <button
          onClick={analyze}
          disabled={loading || !question.trim() || files.length === 0}
          style={{
            padding: '10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            cursor: (loading || !question.trim() || files.length === 0) ? 'default' : 'pointer',
            background: loading ? '#111' : (!question.trim() || files.length === 0) ? '#111' : '#0a2540',
            border: `1px solid ${loading ? '#1e1e1e' : (!question.trim() || files.length === 0) ? '#1e1e1e' : '#1a4a7a'}`,
            color: loading ? '#333' : (!question.trim() || files.length === 0) ? '#333' : '#5ab0f0',
            transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading
            ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> {loadingStep || 'Analysing…'}</>
            : '⚡ Analyse Files + Generate Mindmap'}
        </button>

        {/* ── Results ──────────────────────────────────────────────────── */}
        {result && (
          <>
            {/* Stats bar */}
            <div style={{
              display: 'flex', gap: 8, padding: '6px 10px',
              background: '#0a1a0a', border: '1px solid #1a3a1a', borderRadius: 5,
            }}>
              {[
                { label: 'NODES', value: nodeCount },
                { label: 'DEPTH', value: depthCount },
                { label: 'LEADS', value: leadItems.length },
                { label: 'CONF', value: confidence },
              ].map(({ label, value }) => (
                <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#4a9a5a', fontFamily: 'IBM Plex Mono' }}>{value}</div>
                  <div style={{ fontSize: 8, color: '#3a5a3a', fontFamily: 'IBM Plex Mono', letterSpacing: '0.07em' }}>{label}</div>
                </div>
              ))}
            </div>

            {result.executiveSummary && (
              <div>
                <p style={{ fontSize: 9, color: '#555', marginBottom: 6, fontFamily: 'IBM Plex Mono', letterSpacing: '0.07em' }}>
                  EXECUTIVE SUMMARY
                </p>
                <div style={{
                  padding: '10px 12px',
                  background: '#10151c',
                  border: '1px solid #1a2d42',
                  borderRadius: 6,
                  fontSize: 11,
                  color: '#afc4db',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                }}>
                  {result.executiveSummary}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={spawnOnCanvas}
                disabled={spawned}
                style={{
                  flex: 2, padding: '9px 6px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  cursor: spawned ? 'default' : 'pointer',
                  background: spawned ? '#0a1a0a' : '#0a2a1a',
                  border: `1px solid ${spawned ? '#1a3a1a' : '#2a6a3a'}`,
                  color: spawned ? '#3a6a3a' : '#5acc7a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {spawned ? '✓ Cards placed on canvas' : '🗺 Place Mindmap on Canvas'}
              </button>
              <button
                onClick={downloadJson}
                title="Download full mindmap + answer as JSON"
                style={{
                  flex: 1, padding: '9px 6px', borderRadius: 6, fontSize: 11,
                  cursor: 'pointer', background: '#0a1520', border: '1px solid #1a3a5a',
                  color: '#4a8abf', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
              >
                ↓ JSON
              </button>
            </div>

            <InsightSection title="Priority Leads" items={leadItems} accent="#5acc7a" />
            <InsightSection title="Key Entities" items={entityItems} accent="#8b5cf6" />
            <InsightSection title="Risks" items={riskItems} accent="#f97316" />
            <InsightSection title="Next Questions" items={nextQuestionItems} accent="#06b6d4" />
            <InsightSection title="Timeline" items={timelineItems} accent="#eab308" />

            {/* Canvas placement explanation */}
            {!spawned && (
              <div style={{
                padding: '8px 10px', background: '#0e0e0e', border: '1px solid #1e1e1e',
                borderRadius: 5, fontSize: 10, color: '#555', lineHeight: 1.6,
              }}>
                <span style={{ color: '#3a6a5a' }}>How it works: </span>
                A central <strong style={{ color: '#aaa' }}>Answer card</strong> is placed on the canvas with the full AI response.
                Mipler also creates linked investigation cards for the executive summary, leads, entities, risks, timeline, and questions when they are available.
                Each mindmap topic becomes its own connected node so you can keep expanding the case visually.
              </div>
            )}

            {/* Answer text */}
            <div>
              <p style={{ fontSize: 9, color: '#555', marginBottom: 6, fontFamily: 'IBM Plex Mono', letterSpacing: '0.07em' }}>AI ANSWER</p>
              <div style={{
                padding: '10px 12px', background: '#111', border: '1px solid #1e1e1e',
                borderRadius: 6, fontSize: 11, color: '#c0c0c0', lineHeight: 1.7,
                whiteSpace: 'pre-wrap', maxHeight: 160, overflowY: 'auto',
              }}>
                {result.answer}
              </div>
            </div>

            {/* Mindmap tree preview */}
            <div>
              <p style={{ fontSize: 9, color: '#555', marginBottom: 6, fontFamily: 'IBM Plex Mono', letterSpacing: '0.07em' }}>
                MINDMAP PREVIEW
              </p>
              <div style={{
                background: '#0e0e0e', border: '1px solid #1e1e1e',
                borderRadius: 6, padding: '10px', maxHeight: 220, overflowY: 'auto',
              }}>
                {/* Root */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '3px 10px', background: '#1a2a3a22', border: '1px solid #3b82f633',
                  borderRadius: 5, fontSize: 11, color: '#7ab5f0', fontWeight: 600, marginBottom: 6,
                }}>
                  ◉ {result.mindmap.root}
                </div>
                {result.mindmap.nodes.map(n => (
                  <MiniNodeView key={n.id} node={n} depth={0} />
                ))}
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={() => { setResult(null); setFiles([]); setQuestion(''); setSpawned(false); setError(''); }}
              style={{
                padding: '7px', background: 'none', border: '1px solid #1e1e1e',
                borderRadius: 5, fontSize: 10, color: '#444', cursor: 'pointer', fontFamily: 'IBM Plex Sans',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#888')}
              onMouseLeave={e => (e.currentTarget.style.color = '#444')}
            >
              ↩ Start New Analysis
            </button>
          </>
        )}

        {/* ── How it works (empty state) ───────────────────────────────── */}
        {!result && !loading && (
          <div style={{
            padding: '12px', background: '#0e0e0e', border: '1px solid #1a1a1a',
            borderRadius: 6, marginTop: 4,
          }}>
            <p style={{ fontSize: 9, color: '#444', fontFamily: 'IBM Plex Mono', marginBottom: 8, letterSpacing: '0.06em' }}>HOW IT WORKS</p>
            {[
              { icon: '📂', text: 'Upload any files — JSON exports, logs, reports, CSVs, images' },
              { icon: '❓', text: 'Ask a natural language question about what you want to know' },
              { icon: '🤖', text: 'Ollama analyses the files locally — no data leaves your machine' },
              { icon: '🗺', text: 'A mindmap appears on your canvas with all topics connected to an Answer card' },
              { icon: '↓', text: 'Download the mindmap as JSON to re-import later or share' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 12, flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: 10, color: '#555', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
