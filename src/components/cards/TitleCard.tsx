import React from 'react';
import { BaseCard } from './BaseCard';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import type { CardData } from '../../types';

export const TitleCard: React.FC<{ id: string; data: CardData }> = ({ id, data }) => {
  const updateCard = useWorkspaceStore((s) => s.updateCard);

  return (
    <BaseCard
      id={id}
      title={data.title || 'Title'}
      width={data.width || 400}
      cardColor={data.cardColor || '#1e1e2a'}
      onTitleChange={(t) => updateCard(id, { title: t })}
      headerExtra={
        <span style={{
          fontSize: 7, padding: '1px 5px', background: '#2a2a3a',
          border: '1px solid #3a3a5a', borderRadius: 3, color: '#9a9af0',
          fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em',
        }}>TITLE</span>
      }
    >
      <div style={{ padding: '4px 0' }}>
        <input
          type="text"
          value={data.title}
          onChange={(e) => updateCard(id, { title: e.target.value })}
          placeholder="Investigation Title..."
          style={{
            width: '100%', padding: '8px 0', background: 'transparent',
            border: 'none', outline: 'none',
            fontSize: 18, fontWeight: 700, color: '#e0e0e0',
            fontFamily: 'IBM Plex Sans, sans-serif',
            boxSizing: 'border-box' as const,
          }}
        />
        <textarea
          value={data.content}
          onChange={(e) => updateCard(id, { content: e.target.value })}
          placeholder="Description or summary of this investigation..."
          rows={3}
          style={{
            width: '100%', padding: '6px 0', background: 'transparent',
            border: 'none', outline: 'none',
            fontSize: 12, color: '#888', lineHeight: 1.6,
            fontFamily: 'IBM Plex Sans, sans-serif',
            resize: 'vertical',
            boxSizing: 'border-box' as const,
          }}
        />
      </div>
    </BaseCard>
  );
};
