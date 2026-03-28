import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { spawnMindmapOnCanvas } from '../../store/useWorkspaceStore';

export const ImportModal: React.FC = () => {
  const { importModalOpen, setImportModalOpen, loadWorkspaceState } = useWorkspaceStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      setError('Only .json files are supported for import.');
      return;
    }
    setBusy(true);
    setError('');
    setStatus('Reading file…');

    let parsed: any;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setError(`"${file.name}" is not valid JSON — the file may be corrupted or incomplete.`);
      setBusy(false);
      setStatus('');
      return;
    }

    // ── Detect: Mipler Mindmap export ──────────────────────────────────────
    if (parsed && typeof parsed === 'object' && parsed.answer !== undefined && parsed.mindmap?.root) {
      setStatus('Detected Mipler mindmap — placing cards on canvas…');
      try {
        spawnMindmapOnCanvas(parsed);
        setStatus('');
        setImportModalOpen(false);
      } catch (e: any) {
        setError(`Failed to place mindmap: ${e.message}`);
      }
      setBusy(false);
      return;
    }

    // ── Detect: Mipler Workspace export ────────────────────────────────────
    if (
      parsed &&
      typeof parsed === 'object' &&
      (Array.isArray(parsed.investigations) || Array.isArray(parsed.nodes))
    ) {
      setStatus('Detected Mipler workspace — loading…');
      try {
        loadWorkspaceState(parsed);
        setImportModalOpen(false);
      } catch (e: any) {
        setError(`Failed to load workspace: ${e.message}`);
      }
      setBusy(false);
      setStatus('');
      return;
    }

    // ── Unknown JSON ───────────────────────────────────────────────────────
    setError(
      `"${file.name}" is a JSON file but Mipler doesn't recognise its format.\n\n` +
      `Expected:\n` +
      `  • A Mipler workspace export  (has "investigations" or "nodes")\n` +
      `  • A Mipler mindmap export    (has "answer" + "mindmap")\n\n` +
      `Make sure you exported from Mipler's menu (⋮ → Export) or the AI Analysis panel (↓ JSON).`
    );
    setBusy(false);
    setStatus('');
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) await processFile(f);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) await processFile(f);
  };

  const reset = () => { setError(''); setStatus(''); setBusy(false); };

  return (
    <Modal
      open={importModalOpen}
      onClose={() => { setImportModalOpen(false); reset(); }}
      title="Import JSON"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Description */}
        <p style={{ fontSize: 12, color: '#666', fontFamily: 'IBM Plex Sans', lineHeight: 1.6 }}>
          Import a Mipler <strong style={{ color: '#888' }}>workspace</strong> or <strong style={{ color: '#888' }}>mindmap</strong> JSON file.
          Mindmaps are placed as cards on your canvas. Workspaces replace the current investigation.
        </p>

        {/* What's accepted */}
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 6, padding: '10px 12px' }}>
          <p style={{ fontSize: 9, color: '#444', fontFamily: 'IBM Plex Mono', marginBottom: 8, letterSpacing: '0.06em' }}>ACCEPTED FILE TYPES</p>
          {[
            { icon: '🗺', title: 'Mipler Mindmap JSON', desc: 'Exported from AI File Analysis panel (↓ JSON button) — places cards on the canvas' },
            { icon: '💾', title: 'Mipler Workspace JSON', desc: 'Exported from the menu (⋮ → Export) — loads all investigations and cards' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
              <div>
                <p style={{ fontSize: 11, color: '#888', fontFamily: 'IBM Plex Sans', fontWeight: 500 }}>{title}</p>
                <p style={{ fontSize: 10, color: '#555', fontFamily: 'IBM Plex Sans', lineHeight: 1.5, marginTop: 2 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? '#3b82f6' : '#252525'}`,
            borderRadius: 8, padding: '20px',
            textAlign: 'center', cursor: 'pointer',
            background: dragOver ? '#0a1220' : '#0f0f0f',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 6, opacity: 0.4 }}>📥</div>
          <p style={{ fontSize: 12, color: dragOver ? '#7ab3f0' : '#555', fontFamily: 'IBM Plex Sans' }}>
            {dragOver ? 'Drop to import' : 'Drop JSON here or click to browse'}
          </p>
          <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleFileInput} />
        </div>

        {/* Status */}
        {status && !error && (
          <div style={{ padding: '8px 12px', background: '#0a1520', border: '1px solid #1a3a5a', borderRadius: 5 }}>
            <p style={{ fontSize: 11, color: '#4a8abf', fontFamily: 'IBM Plex Mono' }}>{status}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: '10px 12px', background: '#1e0a0a', border: '1px solid #4a1a1a', borderRadius: 5 }}>
            <p style={{ fontSize: 11, color: '#cc5555', fontFamily: 'IBM Plex Sans', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{error}</p>
            <button onClick={reset} style={{ marginTop: 8, fontSize: 10, color: '#4a8abf', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'IBM Plex Sans', padding: 0 }}>
              Try again
            </button>
          </div>
        )}

        {busy && (
          <div style={{ padding: '8px 12px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 5 }}>
            <p style={{ fontSize: 11, color: '#888', fontFamily: 'IBM Plex Mono' }}>Processing…</p>
          </div>
        )}

        <p style={{ fontSize: 10, color: '#383838', fontFamily: 'IBM Plex Sans' }}>
          🔒 All data stays on your machine — nothing is uploaded anywhere.
        </p>
      </div>
    </Modal>
  );
};
