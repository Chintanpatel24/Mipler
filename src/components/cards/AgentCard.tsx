import React, { useEffect, useState } from 'react';
import { BaseCard } from './BaseCard';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import type { CardData, AgentConfig } from '../../types';
import { apiService, type AgentProfile } from '../../services/api';

const AGENT_COLORS = ['#1a2a4a', '#2a1a3a', '#1a3a2a', '#3a2a1a', '#1a2a3a', '#2a3a1a'];

const PERSONALITY_PRESETS = [
  { label: 'Researcher', value: 'You are a thorough researcher. Analyze data carefully, find patterns, and provide evidence-based conclusions.' },
  { label: 'Analyst', value: 'You are a data analyst. Focus on metrics, trends, and quantitative insights. Present findings clearly.' },
  { label: 'Investigator', value: 'You are an OSINT investigator. Follow leads, connect dots, and uncover hidden relationships in data.' },
  { label: 'Summarizer', value: 'You are an expert summarizer. Condense complex information into clear, actionable summaries.' },
  { label: 'Validator', value: 'You are a fact-checker. Verify claims, cross-reference sources, and flag inconsistencies.' },
];

const defaultAgentConfig: AgentConfig = {
  name: 'Agent',
  role: 'analyst',
  personality: '',
  behavior: '',
  profileName: '',
  internetAccess: false,
  model: '',
  systemPrompt: '',
  status: 'idle',
  lastOutput: '',
  autoGenerate: false,
  connectedAgents: [],
};

export const AgentCard: React.FC<{ id: string; data: CardData }> = ({ id, data }) => {
  const updateCard = useWorkspaceStore((s) => s.updateCard);
  const [expanded, setExpanded] = useState(false);
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);

  const config: AgentConfig = { ...defaultAgentConfig, ...(data.agentConfig || {}) };

  useEffect(() => {
    let cancelled = false;

    apiService.getAgentProfiles()
      .then((loaded) => {
        if (!cancelled) {
          setProfiles(loaded);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfiles([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isLight = data.cardColor === '#ffffff' || data.cardColor === '#f5f5f0';
  const textColor = isLight ? '#2a2a2a' : '#cccccc';
  const mutedColor = isLight ? '#888' : '#555';
  const inputBg = isLight ? '#f0f0f0' : '#111';
  const inputBorder = isLight ? '#ccc' : '#2a2a2a';

  const updateAgent = (patch: Partial<AgentConfig>) => {
    updateCard(id, {
      title: patch.name ?? config.name,
      agentConfig: { ...config, ...patch },
    });
  };

  const statusColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
    idle: { bg: '#111', border: '#2a2a2a', text: '#555', label: 'Idle' },
    running: { bg: '#0a1520', border: '#1a4a7a', text: '#5ab0f0', label: 'Running...' },
    thinking: { bg: '#1a1a0a', border: '#5a5a2a', text: '#eab308', label: 'Thinking...' },
    done: { bg: '#0a1a0a', border: '#2a6a3a', text: '#5acc7a', label: 'Done' },
    error: { bg: '#1a0a0a', border: '#6a2a2a', text: '#f87171', label: 'Error' },
  };

  const sc = statusColors[config.status] || statusColors.idle;

  return (
    <BaseCard
      id={id}
      title={config.name || 'Agent'}
      width={data.width || 340}
      cardColor={data.cardColor}
      onTitleChange={(t) => updateAgent({ name: t })}
      headerExtra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {config.autoGenerate && (
            <span style={{
              fontSize: 7, padding: '1px 4px', background: '#1a1a2a',
              border: '1px solid #2a2a4a', borderRadius: 3, color: '#7a7af0',
              fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em',
            }}>
              AUTO
            </span>
          )}
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
        {/* Name */}
        <div>
          <label style={{ fontSize: 9, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
            AGENT NAME
          </label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => updateAgent({ name: e.target.value, profileName: '' })}
            placeholder="e.g. Research Bot"
            style={{
              width: '100%', padding: '5px 8px', background: inputBg,
              border: `1px solid ${inputBorder}`, borderRadius: 4,
              fontSize: 12, color: textColor, outline: 'none', fontFamily: 'IBM Plex Sans',
              boxSizing: 'border-box' as const,
            }}
          />
        </div>

        {/* Personality presets */}
        {profiles.length > 0 && (
          <div>
            <label style={{ fontSize: 9, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
              PROFILE LIBRARY
            </label>
            <select
              value={config.profileName || ''}
              onChange={(e) => {
                const profile = profiles.find((item) => item.name === e.target.value);
                if (!profile) {
                  updateAgent({ profileName: '', role: 'analyst' });
                  return;
                }

                updateAgent({
                  name: profile.codename,
                  role: profile.role,
                  profileName: profile.name,
                  personality: profile.prompt,
                  behavior: profile.behavior,
                  systemPrompt: profile.prompt,
                });
              }}
              style={{
                width: '100%', padding: '5px 8px', background: inputBg,
                border: `1px solid ${inputBorder}`, borderRadius: 4,
                fontSize: 11, color: textColor, outline: 'none', fontFamily: 'IBM Plex Sans',
                boxSizing: 'border-box' as const,
              }}
            >
              <option value="">Custom agent</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.name}>
                  {profile.codename} · {profile.category}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Personality presets */}
        <div>
          <label style={{ fontSize: 9, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
            PERSONALITY PRESET
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {PERSONALITY_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => updateAgent({ personality: p.value, systemPrompt: p.value, profileName: '', behavior: '', role: p.label.toLowerCase() })}
                style={{
                  padding: '2px 7px', borderRadius: 10,
                  background: config.personality === p.value ? '#1a2a4a' : '#151515',
                  border: `1px solid ${config.personality === p.value ? '#2a4a7a' : '#222'}`,
                  color: config.personality === p.value ? '#7ab3e8' : '#555',
                  fontSize: 9, cursor: 'pointer', fontFamily: 'IBM Plex Mono',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Personality textarea */}
        <div>
          <label style={{ fontSize: 9, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
            PERSONALITY / SYSTEM PROMPT
          </label>
          <textarea
            value={config.personality}
            onChange={(e) => updateAgent({ personality: e.target.value, systemPrompt: e.target.value, profileName: '' })}
            placeholder="Describe the agent's role, behavior, and instructions..."
            rows={3}
            style={{
              width: '100%', padding: '6px 8px', background: inputBg,
              border: `1px solid ${inputBorder}`, borderRadius: 4,
              fontSize: 11, color: textColor, outline: 'none', resize: 'vertical',
              fontFamily: 'IBM Plex Sans', lineHeight: 1.5,
              boxSizing: 'border-box' as const,
            }}
          />
        </div>

        {config.behavior && (
          <div>
            <label style={{ fontSize: 9, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
              BEHAVIOR
            </label>
            <div style={{
              padding: '8px', background: '#0a0a0a',
              border: '1px solid #1e1e1e', borderRadius: 4,
              fontSize: 10, color: '#888', lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {config.behavior}
            </div>
          </div>
        )}

        {/* Internet access toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 8px', background: inputBg,
          border: `1px solid ${inputBorder}`, borderRadius: 4,
        }}>
          <div>
            <span style={{ fontSize: 11, color: textColor, fontFamily: 'IBM Plex Sans' }}>
              Internet Access
            </span>
            <span style={{ fontSize: 9, color: mutedColor, display: 'block', marginTop: 1, fontFamily: 'IBM Plex Mono' }}>
              Allow web fetching
            </span>
          </div>
          <button
            onClick={() => updateAgent({ internetAccess: !config.internetAccess })}
            style={{
              width: 36, height: 20, borderRadius: 10,
              background: config.internetAccess ? '#1a3a2a' : '#222',
              border: `1px solid ${config.internetAccess ? '#2a6a3a' : '#333'}`,
              cursor: 'pointer', position: 'relative',
              transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              background: config.internetAccess ? '#5acc7a' : '#555',
              position: 'absolute', top: 2,
              left: config.internetAccess ? 18 : 3,
              transition: 'all 0.15s',
            }} />
          </button>
        </div>

        {/* Auto-generate toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 8px', background: inputBg,
          border: `1px solid ${inputBorder}`, borderRadius: 4,
        }}>
          <div>
            <span style={{ fontSize: 11, color: textColor, fontFamily: 'IBM Plex Sans' }}>
              Auto-Generate Cards
            </span>
            <span style={{ fontSize: 9, color: mutedColor, display: 'block', marginTop: 1, fontFamily: 'IBM Plex Mono' }}>
              Agent creates cards while thinking
            </span>
          </div>
          <button
            onClick={() => updateAgent({ autoGenerate: !config.autoGenerate })}
            style={{
              width: 36, height: 20, borderRadius: 10,
              background: config.autoGenerate ? '#1a2a4a' : '#222',
              border: `1px solid ${config.autoGenerate ? '#2a4a7a' : '#333'}`,
              cursor: 'pointer', position: 'relative',
              transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              background: config.autoGenerate ? '#5ab0f0' : '#555',
              position: 'absolute', top: 2,
              left: config.autoGenerate ? 18 : 3,
              transition: 'all 0.15s',
            }} />
          </button>
        </div>

        {/* Expand advanced settings */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            padding: '3px 0', background: 'none', border: 'none',
            fontSize: 9, color: '#444', cursor: 'pointer', fontFamily: 'IBM Plex Mono',
            textAlign: 'left',
          }}
        >
          {expanded ? '▼' : '▶'} Advanced
        </button>

        {expanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <label style={{ fontSize: 9, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
                MODEL (leave empty for default)
              </label>
              <input
                type="text"
                value={config.model}
                onChange={(e) => updateAgent({ model: e.target.value })}
                placeholder="qwen2.5:0.5b, mistral, gemma2..."
                style={{
                  width: '100%', padding: '5px 8px', background: inputBg,
                  border: `1px solid ${inputBorder}`, borderRadius: 4,
                  fontSize: 12, color: textColor, outline: 'none', fontFamily: 'IBM Plex Mono',
                  boxSizing: 'border-box' as const,
                }}
              />
            </div>
          </div>
        )}

        {/* Output preview */}
        {config.lastOutput && (
          <div>
            <label style={{ fontSize: 9, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
              LAST OUTPUT
            </label>
            <div style={{
              padding: '8px', background: '#0a0a0a',
              border: '1px solid #1e1e1e', borderRadius: 4,
              fontSize: 10, color: '#888', lineHeight: 1.5,
              maxHeight: 100, overflowY: 'auto',
              fontFamily: 'IBM Plex Sans',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {config.lastOutput.slice(0, 500)}
              {config.lastOutput.length > 500 ? '...' : ''}
            </div>
          </div>
        )}
      </div>
    </BaseCard>
  );
};
