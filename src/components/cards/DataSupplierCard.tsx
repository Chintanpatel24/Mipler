import React from 'react';
import { BaseCard } from './BaseCard';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import type { CardData, ImportedFile } from '../../types';

export const DataSupplierCard: React.FC<{ id: string; data: CardData }> = ({ id, data }) => {
  const updateCard = useWorkspaceStore((s) => s.updateCard);
  const nodes = useWorkspaceStore((s) => s.nodes);
  const edges = useWorkspaceStore((s) => s.edges);

  const isLight = data.cardColor === '#ffffff' || data.cardColor === '#f5f5f0';
  const textColor = isLight ? '#2a2a2a' : '#cccccc';
  const mutedColor = isLight ? '#888' : '#555';

  // Find connected import cards (inputs to this supplier)
  const inputEdges = edges.filter(e => e.target === id);
  const sourceNodes = inputEdges
    .map(e => nodes.find(n => n.id === e.source))
    .filter(Boolean);

  const importSources = sourceNodes.filter(n => n!.data.cardType === 'import-card');
  const allFiles: ImportedFile[] = importSources.flatMap(n => n!.data.importedFiles || []);
  const allContent = sourceNodes
    .map(n => n!.data.content || n!.data.executionOutput || '')
    .filter(Boolean)
    .join('\n\n');

  const supplierOutput = {
    files: allFiles.map(f => ({
      name: f.name,
      type: f.type,
      data: typeof f.data === 'string' ? f.data.slice(0, 10000) : JSON.stringify(f.data).slice(0, 10000),
      size: f.size,
    })),
    textContent: allContent.slice(0, 10000),
    sourceCount: sourceNodes.length,
    totalFiles: allFiles.length,
  };

  return (
    <BaseCard
      id={id}
      title={data.title || 'Data Supplier'}
      width={data.width || 340}
      cardColor={data.cardColor || '#1a2a2a'}
      onTitleChange={(t) => updateCard(id, { title: t })}
      headerExtra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 7, padding: '1px 5px', background: '#0a2a2a',
            border: '1px solid #1a4a4a', borderRadius: 3, color: '#5ae0e0',
            fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em',
          }}>SUPPLIER</span>
          {allFiles.length > 0 && (
            <span style={{
              fontSize: 7, padding: '1px 4px', background: '#1a3a3a',
              border: '1px solid #2a5a5a', borderRadius: 3, color: '#7ae8e8',
              fontFamily: 'IBM Plex Mono',
            }}>
              {allFiles.length} files
            </span>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          padding: '8px', background: '#0a1515',
          border: '1px solid #1a2a2a', borderRadius: 4,
          fontSize: 10, color: '#6a9a9a', fontFamily: 'IBM Plex Mono',
        }}>
          <div style={{ marginBottom: 4 }}>
            <strong>Connected Sources:</strong> {sourceNodes.length}
          </div>
          <div style={{ marginBottom: 4 }}>
            <strong>Total Files:</strong> {allFiles.length}
          </div>
          <div>
            <strong>Data Size:</strong> {allContent.length > 0 ? `${(allContent.length / 1024).toFixed(1)}KB text` : 'No text data'}
          </div>
        </div>

        {sourceNodes.length === 0 ? (
          <p style={{ fontSize: 9, color: '#444', textAlign: 'center', padding: '8px 0' }}>
            Connect Import Cards or other data sources to this card.<br/>
            It will collect and pass data to Agent Groups.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {sourceNodes.map((n, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 6px', background: '#0f1515',
                border: '1px solid #1a2525', borderRadius: 3,
              }}>
                <span style={{
                  fontSize: 7, padding: '1px 3px', background: '#1a3a2a',
                  color: '#5a9a5a', borderRadius: 2, fontFamily: 'IBM Plex Mono', flexShrink: 0,
                }}>
                  {n!.data.cardType.toUpperCase().slice(0, 4)}
                </span>
                <span style={{ flex: 1, fontSize: 10, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n!.data.title}
                </span>
              </div>
            ))}
          </div>
        )}

        {allFiles.length > 0 && (
          <div>
            <label style={{ fontSize: 8, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
              FILES
            </label>
            {allFiles.slice(0, 5).map((f, i) => (
              <div key={i} style={{
                fontSize: 9, color: '#888', padding: '2px 0',
                fontFamily: 'IBM Plex Mono',
              }}>
                • {f.name} ({(f.size / 1024).toFixed(1)}KB)
              </div>
            ))}
            {allFiles.length > 5 && (
              <div style={{ fontSize: 8, color: '#555', fontFamily: 'IBM Plex Mono' }}>
                +{allFiles.length - 5} more files
              </div>
            )}
          </div>
        )}

        <p style={{ fontSize: 8, color: '#333', fontFamily: 'IBM Plex Mono', textAlign: 'center' }}>
          Connect this to an Agent Group to supply data
        </p>
      </div>
    </BaseCard>
  );
};
