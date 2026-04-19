import React from 'react';
import { BaseCard } from './BaseCard';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import type { CardData, WorkflowNodeConfig } from '../../types';

const NODE_COLORS: Record<string, { accent: string; bg: string; border: string; label: string }> = {
  'http-request': { accent: '#3b82f6', bg: '#0a1a2a', border: '#1a3a5a', label: 'HTTP' },
  'code-exec': { accent: '#eab308', bg: '#1a1a0a', border: '#3a3a1a', label: 'CODE' },
  'transform': { accent: '#06b6d4', bg: '#0a1a1a', border: '#1a3a3a', label: 'XFORM' },
  'condition': { accent: '#a855f7', bg: '#1a0a2a', border: '#3a1a5a', label: 'IF' },
  'loop': { accent: '#ec4899', bg: '#2a0a1a', border: '#5a1a3a', label: 'LOOP' },
  'merge': { accent: '#8b5cf6', bg: '#1a0a2a', border: '#2a1a4a', label: 'MERGE' },
  'swarm-agent': { accent: '#7c3aed', bg: '#150a2a', border: '#2a1a5a', label: 'SWARM' },
  'osint-whois': { accent: '#22c55e', bg: '#0a1a0a', border: '#1a3a1a', label: 'WHOIS' },
  'osint-dns': { accent: '#22c55e', bg: '#0a1a0a', border: '#1a3a1a', label: 'DNS' },
  'osint-subdomain': { accent: '#22c55e', bg: '#0a1a0a', border: '#1a3a1a', label: 'SUB' },
  'osint-ip': { accent: '#22c55e', bg: '#0a1a0a', border: '#1a3a1a', label: 'IP' },
  'osint-email': { accent: '#22c55e', bg: '#0a1a0a', border: '#1a3a1a', label: 'EMAIL' },
  'osint-portscan': { accent: '#ef4444', bg: '#1a0a0a', border: '#3a1a1a', label: 'PORTS' },
  'delay': { accent: '#6b7280', bg: '#111', border: '#2a2a2a', label: 'WAIT' },
  'webhook': { accent: '#f97316', bg: '#1a1a0a', border: '#3a2a1a', label: 'HOOK' },
  'trigger': { accent: '#facc15', bg: '#1a1a0a', border: '#3a3a1a', label: 'START' },
};

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  idle: { bg: '#111', border: '#2a2a2a', text: '#555' },
  running: { bg: '#0a1520', border: '#1a4a7a', text: '#5ab0f0' },
  success: { bg: '#0a1a0a', border: '#2a6a3a', text: '#5acc7a' },
  error: { bg: '#1a0a0a', border: '#6a2a2a', text: '#f87171' },
  skipped: { bg: '#1a1a1a', border: '#3a3a3a', text: '#888' },
};

export const WorkflowNodeCard: React.FC<{ id: string; data: CardData }> = ({ id, data }) => {
  const updateCard = useWorkspaceStore((s) => s.updateCard);
  const cardType = data.cardType;
  const colors = NODE_COLORS[cardType] || { accent: '#888', bg: '#111', border: '#2a2a2a', label: 'NODE' };
  const execStatus = data.executionStatus || 'idle';
  const sc = STATUS_COLORS[execStatus] || STATUS_COLORS.idle;
  const config: WorkflowNodeConfig = data.workflowConfig || {};

  const isLight = data.cardColor === '#ffffff' || data.cardColor === '#f5f5f0';
  const textColor = isLight ? '#2a2a2a' : '#cccccc';
  const mutedColor = isLight ? '#888' : '#555';
  const inputBg = isLight ? '#f0f0f0' : '#111';
  const inputBorder = isLight ? '#ccc' : '#2a2a2a';

  const updateConfig = (patch: Partial<WorkflowNodeConfig>) => {
    updateCard(id, {
      workflowConfig: { ...config, ...patch },
      updatedAt: new Date().toISOString(),
    });
  };

  const renderConfig = () => {
    switch (cardType) {
      case 'http-request':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <select value={config.method || 'GET'}
                onChange={e => updateConfig({ method: e.target.value })}
                style={{
                  width: 80, padding: '5px 4px', background: inputBg,
                  border: `1px solid ${inputBorder}`, borderRadius: 4,
                  fontSize: 10, color: textColor, outline: 'none',
                  fontFamily: 'IBM Plex Mono',
                }}>
                {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input value={config.url || ''} onChange={e => updateConfig({ url: e.target.value })}
                placeholder="https://api.example.com/data"
                style={{
                  flex: 1, padding: '5px 8px', background: inputBg,
                  border: `1px solid ${inputBorder}`, borderRadius: 4,
                  fontSize: 10, color: textColor, outline: 'none',
                  fontFamily: 'IBM Plex Mono',
                }} />
            </div>
            <textarea value={config.body || ''} onChange={e => updateConfig({ body: e.target.value })}
              placeholder="Request body (JSON)..."
              rows={2}
              style={{
                width: '100%', padding: '6px 8px', background: inputBg,
                border: `1px solid ${inputBorder}`, borderRadius: 4,
                fontSize: 9, color: textColor, outline: 'none', resize: 'vertical',
                fontFamily: 'IBM Plex Mono', boxSizing: 'border-box' as const,
              }} />
          </div>
        );

      case 'code-exec':
        return (
          <textarea value={config.code || ''} onChange={e => updateConfig({ code: e.target.value })}
            placeholder={'# Available: input, data, context, json\n# Set result = your_output\n\nresult = str(data).upper()'}
            rows={6}
            style={{
              width: '100%', padding: '8px', background: '#0a0a0a',
              border: `1px solid ${inputBorder}`, borderRadius: 4,
              fontSize: 10, color: '#eab308', outline: 'none', resize: 'vertical',
              fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1.5,
              boxSizing: 'border-box' as const,
            }} />
        );

      case 'transform':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <select value={config.transform || 'passthrough'}
              onChange={e => updateConfig({ transform: e.target.value })}
              style={{
                width: '100%', padding: '5px 8px', background: inputBg,
                border: `1px solid ${inputBorder}`, borderRadius: 4,
                fontSize: 10, color: textColor, outline: 'none',
              }}>
              {['passthrough', 'to_string', 'to_json', 'extract_field', 'filter_list',
                'map_list', 'merge', 'split', 'join', 'sort'].map(t =>
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              )}
            </select>
            {(config.transform === 'extract_field') && (
              <input value={config.field || ''} onChange={e => updateConfig({ field: e.target.value })}
                placeholder="field.path.key" style={{
                  width: '100%', padding: '5px 8px', background: inputBg,
                  border: `1px solid ${inputBorder}`, borderRadius: 4,
                  fontSize: 10, color: textColor, outline: 'none',
                  boxSizing: 'border-box' as const,
                }} />
            )}
          </div>
        );

      case 'condition':
        return (
          <input value={config.condition || ''} onChange={e => updateConfig({ condition: e.target.value })}
            placeholder="len(data) > 0"
            style={{
              width: '100%', padding: '6px 8px', background: inputBg,
              border: `1px solid ${inputBorder}`, borderRadius: 4,
              fontSize: 10, color: '#a855f7', outline: 'none',
              fontFamily: 'IBM Plex Mono', boxSizing: 'border-box' as const,
            }} />
        );

      case 'loop':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: mutedColor, fontFamily: 'IBM Plex Mono' }}>MAX</span>
            <input type="number" value={config.maxIterations || 100}
              onChange={e => updateConfig({ maxIterations: parseInt(e.target.value) || 100 })}
              style={{
                width: 70, padding: '4px 6px', background: inputBg,
                border: `1px solid ${inputBorder}`, borderRadius: 4,
                fontSize: 10, color: textColor, outline: 'none',
                fontFamily: 'IBM Plex Mono',
              }} />
            <span style={{ fontSize: 9, color: '#333' }}>iterations</span>
          </div>
        );

      case 'merge':
        return (
          <select value={config.mode || 'concat'}
            onChange={e => updateConfig({ mode: e.target.value })}
            style={{
              width: '100%', padding: '5px 8px', background: inputBg,
              border: `1px solid ${inputBorder}`, borderRadius: 4,
              fontSize: 10, color: textColor, outline: 'none',
            }}>
            <option value="concat">Concat (join arrays)</option>
            <option value="deep_merge">Deep Merge (objects)</option>
            <option value="union">Union (deduplicate)</option>
          </select>
        );

      case 'swarm-agent':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input value={config.swarmTask || ''} onChange={e => updateConfig({ swarmTask: e.target.value })}
              placeholder="Task for the swarm..."
              style={{
                width: '100%', padding: '5px 8px', background: inputBg,
                border: `1px solid ${inputBorder}`, borderRadius: 4,
                fontSize: 10, color: textColor, outline: 'none',
                boxSizing: 'border-box' as const,
              }} />
            <select value={config.swarmStrategy || 'pipeline'}
              onChange={e => updateConfig({ swarmStrategy: e.target.value })}
              style={{
                width: '100%', padding: '5px 8px', background: inputBg,
                border: `1px solid ${inputBorder}`, borderRadius: 4,
                fontSize: 10, color: textColor, outline: 'none',
              }}>
              <option value="pipeline">Pipeline (sequential)</option>
              <option value="parallel">Parallel (simultaneous)</option>
              <option value="debate">Debate (round-robin)</option>
            </select>
            <p style={{ fontSize: 8, color: '#333', fontFamily: 'IBM Plex Mono' }}>
              {(config.swarmAgents || []).length || 3} agents will coordinate
            </p>
          </div>
        );

      case 'delay':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" value={config.seconds || 1}
              onChange={e => updateConfig({ seconds: parseFloat(e.target.value) || 1 })}
              min={0.1} max={60} step={0.5}
              style={{
                width: 60, padding: '4px 6px', background: inputBg,
                border: `1px solid ${inputBorder}`, borderRadius: 4,
                fontSize: 10, color: textColor, outline: 'none',
              }} />
            <span style={{ fontSize: 9, color: mutedColor }}>seconds</span>
          </div>
        );

      case 'trigger':
        return (
          <div style={{ padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>&#9654;</div>
            <p style={{ fontSize: 10, color: mutedColor }}>Workflow entry point</p>
          </div>
        );

      case 'webhook':
        return (
          <div style={{ padding: '8px', textAlign: 'center' }}>
            <p style={{ fontSize: 10, color: mutedColor }}>Output endpoint</p>
            <p style={{ fontSize: 8, color: '#333', fontFamily: 'IBM Plex Mono', marginTop: 4 }}>
              Data flows out to connected nodes
            </p>
          </div>
        );

      default:
        // OSINT nodes
        if (cardType.startsWith('osint-')) {
          return (
            <input value={config.target || ''} onChange={e => updateConfig({ target: e.target.value })}
              placeholder={`Target (domain/IP/email)...`}
              style={{
                width: '100%', padding: '6px 8px', background: inputBg,
                border: `1px solid ${inputBorder}`, borderRadius: 4,
                fontSize: 10, color: textColor, outline: 'none',
                fontFamily: 'IBM Plex Mono', boxSizing: 'border-box' as const,
              }} />
          );
        }
        return null;
    }
  };

  return (
    <BaseCard
      id={id}
      title={data.title || colors.label}
      width={data.width || 340}
      cardColor={data.cardColor}
      onTitleChange={(t) => updateCard(id, { title: t })}
      headerExtra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 7, padding: '1px 5px', background: colors.bg,
            border: `1px solid ${colors.border}`, borderRadius: 3, color: colors.accent,
            fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em', fontWeight: 600,
          }}>
            {colors.label}
          </span>
          <span style={{
            fontSize: 7, padding: '1px 4px', background: sc.bg,
            border: `1px solid ${sc.border}`, borderRadius: 3, color: sc.text,
            fontFamily: 'IBM Plex Mono',
          }}>
            {execStatus}
          </span>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {renderConfig()}

        {/* Execution output */}
        {data.executionOutput && (
          <div>
            <label style={{ fontSize: 8, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
              OUTPUT {data.executionTime && `(${data.executionTime.toFixed(1)}s)`}
            </label>
            <div style={{
              padding: '6px 8px', background: '#0a0a0a',
              border: `1px solid ${execStatus === 'error' ? '#4a1a1a' : '#1e1e1e'}`, borderRadius: 4,
              fontSize: 9, color: execStatus === 'error' ? '#f87171' : '#888', lineHeight: 1.5,
              maxHeight: 120, overflowY: 'auto',
              fontFamily: 'IBM Plex Mono',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {data.executionOutput.slice(0, 2000)}
            </div>
          </div>
        )}
      </div>
    </BaseCard>
  );
};
