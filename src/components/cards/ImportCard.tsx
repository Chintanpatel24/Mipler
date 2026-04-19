import React, { useRef, useState, useCallback } from 'react';
import { BaseCard } from './BaseCard';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import type { CardData, ImportedFile } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { tryParseJsonText } from '../../utils/investigationFlow';

function fileBadge(type: string): string {
  if (type === 'json') return 'JSON';
  if (type === 'pdf') return 'PDF';
  if (type.startsWith('image')) return 'IMG';
  if (type === 'csv') return 'CSV';
  if (['txt', 'md', 'log'].includes(type)) return 'TXT';
  if (['xml', 'html', 'yaml', 'yml'].includes(type)) return type.toUpperCase();
  return 'FILE';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

const EMPTY_FILES: ImportedFile[] = [];

export const ImportCard: React.FC<{ id: string; data: CardData }> = ({ id, data }) => {
  const updateCard = useWorkspaceStore((s) => s.updateCard);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const isLight = data.cardColor === '#ffffff' || data.cardColor === '#f5f5f0';
  const textColor = isLight ? '#2a2a2a' : '#cccccc';
  const mutedColor = isLight ? '#888' : '#555';

  const files: ImportedFile[] = data.importedFiles ?? EMPTY_FILES;
  const pastedJson = tryParseJsonText(data.content || '');

  const readFile = (file: File): Promise<ImportedFile> => new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const fileId = uuidv4();
    const asText = () => {
      const r = new FileReader();
      r.onload = () => resolve({ id: fileId, name: file.name, type: ext || 'txt', data: r.result as string, size: file.size });
      r.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      r.readAsText(file);
    };
    if (ext === 'json') {
      const r = new FileReader();
      r.onload = () => {
        try {
          const parsed = JSON.parse(r.result as string);
          resolve({ id: fileId, name: file.name, type: 'json', data: parsed, size: file.size });
        } catch {
          resolve({ id: fileId, name: file.name, type: 'json', data: r.result as string, size: file.size });
        }
      };
      r.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      r.readAsText(file);
    } else if (file.type.startsWith('image/')) {
      const r = new FileReader();
      r.onload = () => resolve({ id: fileId, name: file.name, type: 'image', data: r.result as string, size: file.size });
      r.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      r.readAsDataURL(file);
    } else if (ext === 'csv') {
      const r = new FileReader();
      r.onload = () => resolve({ id: fileId, name: file.name, type: 'csv', data: r.result as string, size: file.size });
      r.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      r.readAsText(file);
    } else if (ext === 'pdf') {
      const r = new FileReader();
      r.onload = () => resolve({ id: fileId, name: file.name, type: 'pdf', data: r.result as string, size: file.size });
      r.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      r.readAsDataURL(file);
    } else {
      asText();
    }
  });

  const addFiles = useCallback(async (incoming: FileList | null) => {
    if (!incoming) return;
    const added: ImportedFile[] = [...files];
    for (const file of Array.from(incoming)) {
      try { added.push(await readFile(file)); } catch {}
    }
    const contentSummary = added.map(f => `[${fileBadge(f.type)}] ${f.name}`).join(', ');
    updateCard(id, {
      importedFiles: added,
      content: contentSummary,
      title: data.title === 'Import Card' ? `Import (${added.length} files)` : data.title,
    });
  }, [files, id, updateCard, data.title]);

  const removeFile = (fileId: string) => {
    const updated = files.filter(f => f.id !== fileId);
    const contentSummary = updated.map(f => `[${fileBadge(f.type)}] ${f.name}`).join(', ');
    updateCard(id, { importedFiles: updated, content: contentSummary });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <BaseCard
      id={id}
      title={data.title || 'Import Card'}
      width={data.width || 340}
      cardColor={data.cardColor || '#1a2a1a'}
      onTitleChange={(t) => updateCard(id, { title: t })}
      headerExtra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 8, padding: '1px 6px', background: '#0a2a1a',
            border: '1px solid #1a4a2a', borderRadius: 3, color: '#5acc7a',
            fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em',
          }}>
            IMPORT
          </span>
          {files.length > 0 && (
            <span style={{
              fontSize: 8, padding: '1px 4px', background: '#1a3a2a',
              border: '1px solid #2a5a3a', borderRadius: 3, color: '#7ae89a',
              fontFamily: 'IBM Plex Mono',
            }}>
              {files.length}
            </span>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? '#22c55e' : files.length > 0 ? '#1a4a2a' : '#2a2a2a'}`,
            borderRadius: 6, padding: '12px 10px',
            textAlign: 'center', cursor: 'pointer',
            background: dragging ? '#0a1a0a' : files.length > 0 ? '#0a140a' : '#111',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ fontSize: 16, marginBottom: 3, opacity: 0.5 }}>&#128193;</div>
          <p style={{ fontSize: 10, color: files.length > 0 ? '#4a8a4a' : '#555', marginBottom: 2 }}>
            {files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''} loaded` : 'Drop files or click to browse'}
          </p>
          <p style={{ fontSize: 8, color: '#333', fontFamily: 'IBM Plex Mono' }}>
            JSON, CSV, TXT, PDF, Images, XML, any file
          </p>
          <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
            onChange={e => addFiles(e.target.files)} />
        </div>

        {/* Files list */}
        {files.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {files.map(f => (
              <div key={f.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 6px', background: '#0f0f0f',
                border: '1px solid #1e1e1e', borderRadius: 4,
              }}>
                <span style={{
                  fontSize: 7, padding: '1px 3px', background: '#1a3a1a',
                  color: '#5a9a5a', borderRadius: 2, fontFamily: 'IBM Plex Mono', flexShrink: 0,
                }}>
                  {fileBadge(f.type)}
                </span>
                <span style={{
                  flex: 1, fontSize: 10, color: textColor,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {f.name}
                </span>
                <span style={{ fontSize: 8, color: '#383838', fontFamily: 'IBM Plex Mono', flexShrink: 0 }}>
                  {formatSize(f.size)}
                </span>
                <button onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                  style={{
                    padding: '1px 3px', color: '#383838', background: 'none',
                    border: 'none', cursor: 'pointer', borderRadius: 2, flexShrink: 0, lineHeight: 1,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#383838')}>
                  &#10005;
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Content / Notes area */}
        <div>
          <label style={{ fontSize: 8, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
            DATA NOTES
          </label>
          <textarea
            value={data.content}
            onChange={(e) => updateCard(id, { content: e.target.value })}
            placeholder="Add notes about this data, or paste text/JSON directly..."
            rows={3}
            style={{
              width: '100%', padding: '6px 8px', background: '#0a0a0a',
              border: '1px solid #1e1e1e', borderRadius: 4,
              fontSize: 10, color: textColor, outline: 'none', resize: 'vertical',
              fontFamily: 'IBM Plex Sans', lineHeight: 1.5,
              boxSizing: 'border-box' as const,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          />
          <div style={{ marginTop: 4, fontSize: 8, color: pastedJson ? '#5acc7a' : '#555', fontFamily: 'IBM Plex Mono' }}>
            {pastedJson ? 'VALID JSON DETECTED' : 'Paste raw JSON here for the investigation intake'}
          </div>
        </div>

        {files.length === 0 && !data.content && (
          <p style={{ fontSize: 9, color: '#333', fontFamily: 'IBM Plex Mono', textAlign: 'center' }}>
            Connect this card to an Agent via edges
          </p>
        )}
      </div>
    </BaseCard>
  );
};
