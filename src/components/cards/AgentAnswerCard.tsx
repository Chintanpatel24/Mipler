import React from 'react';
import { BaseCard } from './BaseCard';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import type { CardData } from '../../types';

export const AgentAnswerCard: React.FC<{ id: string; data: CardData }> = ({ id, data }) => {
  const updateCard = useWorkspaceStore((s) => s.updateCard);
  const isLight = data.cardColor === '#ffffff' || data.cardColor === '#f5f5f0';
  const textColor = isLight ? '#2a2a2a' : '#cccccc';
  const mutedColor = isLight ? '#888' : '#444';

  const answer = data.answerText || data.content || '';
  const status = data.answerStatus || 'pending';

  const statusConfig: Record<string, { bg: string; border: string; text: string; label: string; icon: string; glowColor: string }> = {
    positive: { bg: '#0a2a1a', border: '#2a6a3a', text: '#5acc7a', label: 'YES', icon: '&#10003;', glowColor: 'rgba(34,197,94,0.15)' },
    negative: { bg: '#2a0a0a', border: '#6a2a2a', text: '#f87171', label: 'NO', icon: '&#10007;', glowColor: 'rgba(239,68,68,0.15)' },
    neutral: { bg: '#1a1a0a', border: '#5a5a2a', text: '#eab308', label: 'INFO', icon: '&#9432;', glowColor: 'rgba(234,179,8,0.15)' },
    pending: { bg: '#111', border: '#2a2a2a', text: '#555', label: 'PENDING', icon: '&#8230;', glowColor: 'transparent' },
  };

  const sc = statusConfig[status] || statusConfig.pending;

  const detectStatus = (text: string): 'positive' | 'negative' | 'neutral' | 'pending' => {
    if (!text.trim()) return 'pending';
    const lower = text.toLowerCase();
    const positiveWords = ['yes', 'go ahead', 'proceed', 'approved', 'correct', 'valid', 'confirmed', 'true', 'good', 'safe', 'recommend'];
    const negativeWords = ['no', 'stop', 'reject', 'incorrect', 'invalid', 'denied', 'false', 'bad', 'danger', 'risk', 'warn'];
    const posScore = positiveWords.filter(w => lower.includes(w)).length;
    const negScore = negativeWords.filter(w => lower.includes(w)).length;
    if (posScore > negScore) return 'positive';
    if (negScore > posScore) return 'negative';
    if (text.trim().length > 0) return 'neutral';
    return 'pending';
  };

  const handleContentChange = (newContent: string) => {
    const detected = detectStatus(newContent);
    updateCard(id, {
      content: newContent,
      answerText: newContent,
      answerStatus: detected,
    });
  };

  return (
    <BaseCard
      id={id}
      title={data.title || 'Agent Answer'}
      width={data.width || 360}
      cardColor={data.cardColor || '#1a1a2a'}
      onTitleChange={(t) => updateCard(id, { title: t })}
      headerExtra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 8, padding: '1px 8px', background: sc.bg,
            border: `1px solid ${sc.border}`, borderRadius: 3, color: sc.text,
            fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em',
            fontWeight: 600,
          }}>
            {sc.label}
          </span>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Answer display area */}
        <div style={{
          padding: '12px', background: sc.glowColor,
          border: `1px solid ${sc.border}`, borderRadius: 6,
          minHeight: 60,
          position: 'relative',
        }}>
          {answer ? (
            <div style={{
              fontSize: 12, color: sc.text, lineHeight: 1.7,
              fontFamily: 'IBM Plex Sans', fontWeight: 500,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {answer}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 20, marginBottom: 4, opacity: 0.3 }}>&#128172;</div>
              <p style={{ fontSize: 10, color: mutedColor, fontFamily: 'IBM Plex Mono' }}>
                Agent Answer
              </p>
              <p style={{ fontSize: 9, color: '#333', fontFamily: 'IBM Plex Mono', marginTop: 3 }}>
                Connect an agent or report to this card
              </p>
              <p style={{ fontSize: 9, color: '#333', fontFamily: 'IBM Plex Mono', marginTop: 1 }}>
                The answer will appear here
              </p>
            </div>
          )}
        </div>

        {/* Manual input */}
        <div>
          <label style={{ fontSize: 8, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
            ANSWER TEXT
          </label>
          <textarea
            value={answer}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Agent answer will appear here, or type manually..."
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
        </div>

        {/* Quick status buttons */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['positive', 'negative', 'neutral'] as const).map(s => {
            const cfg = statusConfig[s];
            return (
              <button
                key={s}
                onClick={() => updateCard(id, { answerStatus: s })}
                style={{
                  flex: 1, padding: '4px 0', borderRadius: 4,
                  background: status === s ? cfg.bg : '#111',
                  border: `1px solid ${status === s ? cfg.border : '#222'}`,
                  color: status === s ? cfg.text : '#555',
                  fontSize: 9, cursor: 'pointer', fontFamily: 'IBM Plex Mono',
                  transition: 'all 0.15s',
                }}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>
    </BaseCard>
  );
};
