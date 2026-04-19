import React from 'react';
import { BaseCard } from './BaseCard';
import type { CardData } from '../../types';

export const AiGeneratedCard: React.FC<{ id: string; data: CardData }> = ({ id, data }) => {
  return (
    <BaseCard
      id={id}
      title={data.title || 'AI Card'}
      width={data.width || 320}
      cardColor={data.cardColor || '#1a2a3a'}
      headerExtra={
        <span style={{
          fontSize: 7, padding: '1px 4px', background: '#0a2a4a',
          color: '#5ab0f0', border: '1px solid #1a4a7a', borderRadius: 3,
          fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em',
        }}>
          AI
        </span>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{
          padding: '8px', background: '#0a0f18', border: '1px solid #1a2a3a',
          borderRadius: 4, fontSize: 11, color: '#a0b8d0', lineHeight: 1.6,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {data.content || 'AI-generated content will appear here.'}
        </div>

        {/* Sub-topics indicator */}
        {data.content?.includes('Sub-topics:') && (
          <div style={{
            padding: '6px 8px', background: '#0a1520', border: '1px solid #1a3040',
            borderRadius: 4,
          }}>
            <span style={{ fontSize: 8, color: '#3a6a8a', fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em' }}>
              CONTAINS SUB-TOPICS
            </span>
          </div>
        )}
      </div>
    </BaseCard>
  );
};
