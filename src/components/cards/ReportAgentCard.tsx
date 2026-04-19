import React from 'react';
import { BaseCard } from './BaseCard';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import type { CardData } from '../../types';

export const ReportAgentCard: React.FC<{ id: string; data: CardData }> = ({ id, data }) => {
  const updateCard = useWorkspaceStore((s) => s.updateCard);
  const isLight = data.cardColor === '#ffffff' || data.cardColor === '#f5f5f0';
  const textColor = isLight ? '#2a2a2a' : '#cccccc';
  const mutedColor = isLight ? '#888' : '#444';

  const report = data.reportData;

  const statusColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
    idle: { bg: '#111', border: '#2a2a2a', text: '#555', label: 'Waiting' },
    running: { bg: '#1a1a0a', border: '#5a5a2a', text: '#eab308', label: 'Generating...' },
    done: { bg: '#0a1a0a', border: '#2a6a3a', text: '#5acc7a', label: 'Ready' },
    error: { bg: '#1a0a0a', border: '#6a2a2a', text: '#f87171', label: 'Error' },
  };

  const reportStatus =
    data.executionStatus === 'success'
      ? 'done'
      : data.executionStatus === 'running'
        ? 'running'
        : data.executionStatus === 'error'
          ? 'error'
          : data.agentConfig?.status || 'idle';
  const sc = statusColors[reportStatus] || statusColors.idle;

  return (
    <BaseCard
      id={id}
      title={data.title || 'Report Agent'}
      width={data.width || 400}
      cardColor={data.cardColor || '#2a1a1a'}
      onTitleChange={(t) => updateCard(id, { title: t })}
      headerExtra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 8, padding: '1px 6px', background: sc.bg,
            border: `1px solid ${sc.border}`, borderRadius: 3, color: sc.text,
            fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em',
          }}>
            {sc.label}
          </span>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Report content */}
        {report ? (
          <>
            {/* Summary */}
            <div>
              <label style={{ fontSize: 8, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
                SUMMARY
              </label>
              <div style={{
                padding: '8px', background: '#0a0a0a',
                border: '1px solid #1e1e1e', borderRadius: 4,
                fontSize: 10, color: textColor, lineHeight: 1.6,
                fontFamily: 'IBM Plex Sans',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {report.summary}
              </div>
            </div>

            {/* Findings */}
            {report.findings.length > 0 && (
              <div>
                <label style={{ fontSize: 8, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
                  KEY FINDINGS ({report.findings.length})
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {report.findings.map((finding, i) => (
                    <div key={i} style={{
                      padding: '5px 8px', background: '#0a1a0a',
                      border: '1px solid #1a2a1a', borderRadius: 3,
                      fontSize: 10, color: '#8ac89a', lineHeight: 1.5,
                      fontFamily: 'IBM Plex Sans',
                    }}>
                      <span style={{ color: '#5a9a5a', marginRight: 6, fontFamily: 'IBM Plex Mono' }}>{i + 1}.</span>
                      {finding}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confidence */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', background: '#0a0a0a',
              border: '1px solid #1e1e1e', borderRadius: 4,
            }}>
              <span style={{ fontSize: 9, color: mutedColor, fontFamily: 'IBM Plex Mono' }}>CONFIDENCE</span>
              <div style={{ flex: 1, height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  width: `${(report.confidence * 100)}%`, height: '100%',
                  background: report.confidence > 0.7 ? '#22c55e' : report.confidence > 0.4 ? '#eab308' : '#ef4444',
                  borderRadius: 2, transition: 'width 0.3s',
                }} />
              </div>
              <span style={{ fontSize: 10, color: textColor, fontFamily: 'IBM Plex Mono' }}>
                {(report.confidence * 100).toFixed(0)}%
              </span>
            </div>

            {(report.threatLevel || report.simulation?.forecast) && (
              <div style={{
                padding: '8px', background: '#0d1014',
                border: '1px solid #1b2430', borderRadius: 4,
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                {report.threatLevel && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 8, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em' }}>
                      THREAT LEVEL
                    </span>
                    <span style={{
                      fontSize: 9,
                      padding: '2px 6px',
                      borderRadius: 999,
                      background: report.threatLevel === 'critical' ? '#2a0a0a' : report.threatLevel === 'high' ? '#33130d' : report.threatLevel === 'medium' ? '#2f280d' : '#102313',
                      border: `1px solid ${report.threatLevel === 'critical' ? '#6a2a2a' : report.threatLevel === 'high' ? '#7a3a1a' : report.threatLevel === 'medium' ? '#6a5a2a' : '#2a6a3a'}`,
                      color: report.threatLevel === 'critical' ? '#f87171' : report.threatLevel === 'high' ? '#fb923c' : report.threatLevel === 'medium' ? '#facc15' : '#5acc7a',
                      fontFamily: 'IBM Plex Mono',
                      textTransform: 'uppercase',
                    }}>
                      {report.threatLevel}
                    </span>
                  </div>
                )}

                {report.simulation?.forecast && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 8, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em' }}>
                      SIMULATION
                    </span>
                    {report.simulation.scenario && (
                      <div style={{ fontSize: 9, color: '#9fb3c8', lineHeight: 1.5 }}>
                        Scenario: {report.simulation.scenario}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: textColor, lineHeight: 1.6 }}>
                      {report.simulation.forecast}
                    </div>
                    {report.simulation.assumptions.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {report.simulation.assumptions.map((assumption, index) => (
                          <div key={index} style={{ fontSize: 9, color: '#8fa0ae', lineHeight: 1.5 }}>
                            • {assumption}
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize: 9, color: '#7a8a99', fontFamily: 'IBM Plex Mono' }}>
                      Confidence: {report.simulation.confidence}%
                    </div>
                  </div>
                )}
              </div>
            )}

            {report.questionAnswer && (
              <div>
                <label style={{ fontSize: 8, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
                  SHORT ANSWER
                </label>
                <div style={{
                  padding: '8px', background: '#0a1116',
                  border: '1px solid #18232c', borderRadius: 4,
                  fontSize: 10, color: '#d8e1e8', lineHeight: 1.6,
                }}>
                  {report.questionAnswer}
                </div>
              </div>
            )}

            {/* Sources */}
            {report.sources.length > 0 && (
              <div>
                <label style={{ fontSize: 8, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
                  SOURCES
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {report.sources.map((src, i) => (
                    <span key={i} style={{
                      fontSize: 8, padding: '2px 6px', background: '#1a1a1a',
                      border: '1px solid #2a2a2a', borderRadius: 3, color: '#888',
                      fontFamily: 'IBM Plex Mono',
                    }}>
                      {src}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Decision options */}
            {report.options && report.options.length > 0 && (
              <div>
                <label style={{ fontSize: 8, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
                  OPTIONS
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {report.options.map((opt, i) => (
                    <div key={i} style={{
                      padding: '7px 8px', background: '#0d1014',
                      border: '1px solid #1b2430', borderRadius: 4,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 10, color: '#9fb3c8', fontFamily: 'IBM Plex Mono' }}>{opt.title}</span>
                        <span style={{ fontSize: 9, color: '#7a8a99', fontFamily: 'IBM Plex Mono' }}>{opt.confidence}% | {opt.risk}</span>
                      </div>
                      <div style={{ fontSize: 10, color: textColor, lineHeight: 1.5 }}>{opt.decision}</div>
                      {opt.evidence && <div style={{ fontSize: 9, color: '#8a9aaa', marginTop: 3, lineHeight: 1.5 }}>Evidence: {opt.evidence}</div>}
                      {opt.verificationStep && <div style={{ fontSize: 9, color: '#9aa68a', marginTop: 2, lineHeight: 1.5 }}>Verify: {opt.verificationStep}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Priority actions */}
            {report.priorityActions && report.priorityActions.length > 0 && (
              <div>
                <label style={{ fontSize: 8, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
                  PRIORITY ACTIONS
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {report.priorityActions.map((a, i) => (
                    <div key={i} style={{ fontSize: 10, color: '#c5d2a8', lineHeight: 1.5 }}>• {a}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Intelligence gaps */}
            {report.intelligenceGaps && report.intelligenceGaps.length > 0 && (
              <div>
                <label style={{ fontSize: 8, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
                  INTELLIGENCE GAPS
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {report.intelligenceGaps.map((g, i) => (
                    <div key={i} style={{ fontSize: 10, color: '#c8a8a8', lineHeight: 1.5 }}>• {g}</div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '16px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 6, opacity: 0.3 }}>&#128203;</div>
            <p style={{ fontSize: 10, color: mutedColor, fontFamily: 'IBM Plex Mono', marginBottom: 4 }}>
              Report Agent
            </p>
            <p style={{ fontSize: 9, color: '#333', fontFamily: 'IBM Plex Mono' }}>
              Connect agent outputs to this card
            </p>
            <p style={{ fontSize: 9, color: '#333', fontFamily: 'IBM Plex Mono', marginTop: 2 }}>
              It will compile analysis into a report
            </p>
          </div>
        )}

        {/* Manual content override */}
        <div>
          <label style={{ fontSize: 8, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
            NOTES
          </label>
          <textarea
            value={data.content}
            onChange={(e) => updateCard(id, { content: e.target.value })}
            placeholder="Add notes or instructions for the report..."
            rows={2}
            style={{
              width: '100%', padding: '6px 8px', background: '#0a0a0a',
              border: '1px solid #1e1e1e', borderRadius: 4,
              fontSize: 10, color: textColor, outline: 'none', resize: 'vertical',
              fontFamily: 'IBM Plex Sans', lineHeight: 1.5,
              boxSizing: 'border-box' as const,
            }}
          />
        </div>
      </div>
    </BaseCard>
  );
};
