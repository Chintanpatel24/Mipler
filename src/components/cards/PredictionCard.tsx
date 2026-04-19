import React from 'react';
import { BaseCard } from './BaseCard';
import type { CardData } from '../../types';

export const PredictionCard: React.FC<{ id: string; data: CardData }> = ({ id, data }) => {
  const pred = data.predictionData;

  return (
    <BaseCard
      id={id}
      title={data.title || 'Prediction'}
      width={data.width || 360}
      cardColor={data.cardColor || '#2a1a3a'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pred ? (
          <>
            {/* Action */}
            <div>
              <label style={{ fontSize: 9, color: '#8b5cf6', fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                RECOMMENDED ACTION
              </label>
              <p style={{ fontSize: 11, color: '#c0b0d0', lineHeight: 1.5 }}>{pred.action}</p>
            </div>

            {/* Predictions */}
            <div>
              <label style={{ fontSize: 9, color: '#6b6baf', fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                PREDICTIONS
              </label>
              {pred.predictions.map((p, i) => (
                <p key={i} style={{ fontSize: 10, color: '#aaa', lineHeight: 1.5, marginBottom: 2 }}>
                  &#8226; {p}
                </p>
              ))}
            </div>

            {/* Confidence bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 9, color: '#6b6baf', fontFamily: 'IBM Plex Mono' }}>CONFIDENCE</span>
              <div style={{ flex: 1, height: 4, background: '#1a1a2a', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  width: `${pred.confidence * 100}%`, height: '100%',
                  background: `linear-gradient(90deg, #5b21b6, #8b5cf6)`,
                  borderRadius: 2, transition: 'width 0.5s',
                }} />
              </div>
              <span style={{ fontSize: 9, color: '#8b5cf6', fontFamily: 'IBM Plex Mono' }}>
                {(pred.confidence * 100).toFixed(0)}%
              </span>
            </div>

            {/* Risks */}
            {pred.risks.length > 0 && (
              <div style={{ padding: '6px 8px', background: '#1a1008', border: '1px solid #3a2a10', borderRadius: 4 }}>
                <label style={{ fontSize: 9, color: '#f97316', fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                  RISKS
                </label>
                {pred.risks.map((r, i) => (
                  <p key={i} style={{ fontSize: 10, color: '#d09060', lineHeight: 1.5, marginBottom: 2 }}>
                    &#9888; {r}
                  </p>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '8px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 4 }}>
            <p style={{ fontSize: 10, color: '#888', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {data.content || 'No prediction data available. Run an analysis to generate predictions.'}
            </p>
          </div>
        )}
      </div>
    </BaseCard>
  );
};
