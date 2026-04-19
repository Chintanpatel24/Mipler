import React from 'react';
import { BaseCard } from './BaseCard';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import type { CardData } from '../../types';

export const AgentOutputCard: React.FC<{ id: string; data: CardData }> = ({ id, data }) => {
  const updateCard = useWorkspaceStore((s) => s.updateCard);
  const isLight = data.cardColor === '#ffffff' || data.cardColor === '#f5f5f0';
  const textColor = isLight ? '#2a2a2a' : '#cccccc';
  const mutedColor = isLight ? '#888' : '#444';

  return (
    <BaseCard
      id={id}
      title={data.title || 'Output'}
      width={data.width || 380}
      cardColor={data.cardColor}
      onTitleChange={(t) => updateCard(id, { title: t })}
      headerExtra={
        <span style={{
          fontSize: 8, padding: '1px 6px', background: '#1a1a2a',
          border: '1px solid #2a2a4a', borderRadius: 3, color: '#7a7af0',
          fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em',
        }}>
          OUTPUT
        </span>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <textarea
          value={data.content}
          onChange={(e) => updateCard(id, { content: e.target.value })}
          placeholder="Agent output will appear here. You can also type directly..."
          rows={6}
          style={{
            width: '100%', padding: '8px', background: '#0a0a0a',
            border: '1px solid #1e1e1e', borderRadius: 4,
            fontSize: 11, color: textColor, outline: 'none', resize: 'vertical',
            fontFamily: 'IBM Plex Sans', lineHeight: 1.6,
            boxSizing: 'border-box' as const,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        />
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          <button
            onClick={() => {
              navigator.clipboard.writeText(data.content);
            }}
            style={{
              padding: '3px 8px', background: '#1a1a1a',
              border: '1px solid #2a2a2a', borderRadius: 4,
              fontSize: 9, color: '#555', cursor: 'pointer',
              fontFamily: 'IBM Plex Mono',
            }}
          >
            Copy
          </button>
          <button
            onClick={() => updateCard(id, { content: '' })}
            style={{
              padding: '3px 8px', background: '#1a0a0a',
              border: '1px solid #2a1a1a', borderRadius: 4,
              fontSize: 9, color: '#884444', cursor: 'pointer',
              fontFamily: 'IBM Plex Mono',
            }}
          >
            Clear
          </button>
        </div>
        {!data.content && (
          <div style={{ padding: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: 10, color: mutedColor, fontFamily: 'IBM Plex Mono' }}>
              Connect an Agent card to this output
            </p>
            <p style={{ fontSize: 9, color: '#333', marginTop: 4, fontFamily: 'IBM Plex Mono' }}>
              Drag from agent handle to this card's handle
            </p>
          </div>
        )}
      </div>
    </BaseCard>
  );
};
