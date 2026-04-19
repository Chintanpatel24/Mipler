import React, { useEffect, useMemo, useState } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { apiService, type AgentProfile } from '../services/api';
import { DEFAULT_INVESTIGATION_PROFILE_NAMES } from '../utils/investigationFlow';

const CATEGORY_COLORS: Record<string, string> = {
  'Commander & Orchestrator': '#7ab3e8',
  'Master Detectives': '#5acc7a',
  'The masterminds': '#d4a800',
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '#9a9af0';
}

function sortProfiles(left: AgentProfile, right: AgentProfile): number {
  const categoryCompare = left.category.localeCompare(right.category);
  if (categoryCompare !== 0) return categoryCompare;
  return left.codename.localeCompare(right.codename);
}

export const AgentSidebar: React.FC = () => {
  const {
    nodes,
    updateCard,
    clearWorkspace,
    setAgentSidebarOpen,
  } = useWorkspaceStore();
  const investigations = useWorkspaceStore((s) => s.investigations);
  const activeInvestigationId = useWorkspaceStore((s) => s.activeInvestigationId);
  const activeInvestigation = investigations.find((item) => item.id === activeInvestigationId);
  const isAiWorkspace = !!activeInvestigation?.isAiAnalysis;

  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfiles = async () => {
      setLoading(true);
      setError(null);

      try {
        const loaded = await apiService.getAgentProfiles();
        if (!cancelled) {
          setProfiles(loaded.slice().sort(sortProfiles));
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setError(message);
          setProfiles([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProfiles();

    return () => {
      cancelled = true;
    };
  }, []);

  const swarmNode = useMemo(
    () =>
      nodes.find((node) => node.selected && node.data.cardType === 'agent-group')
      || nodes.find((node) => node.data.cardType === 'agent-group')
      || null,
    [nodes],
  );

  const defaultRoster = useMemo(
    () => profiles.map((profile) => profile.name),
    [profiles],
  );

  const activeAgentNames = useMemo(() => {
    if (!swarmNode) return [];
    const configured = swarmNode.data.agentGroupAgents || [];
    if (configured.length > 0) return configured;
    return defaultRoster;
  }, [defaultRoster, swarmNode]);

  const activeProfiles = useMemo(
    () =>
      activeAgentNames
        .map((name) => profiles.find((profile) => profile.name === name || profile.codename === name))
        .filter((profile): profile is AgentProfile => !!profile),
    [activeAgentNames, profiles],
  );

  const groupedProfiles = useMemo(() => {
    const grouped = new Map<string, AgentProfile[]>();
    for (const profile of profiles) {
      const group = grouped.get(profile.category) || [];
      group.push(profile);
      grouped.set(profile.category, group);
    }
    return Array.from(grouped.entries());
  }, [profiles]);

  const toggleProfile = (profile: AgentProfile) => {
    if (!swarmNode) return;

    const active = activeAgentNames.includes(profile.name) || activeAgentNames.includes(profile.codename);
    const next = active
      ? activeAgentNames.filter((name) => name !== profile.name && name !== profile.codename)
      : [...activeAgentNames, profile.name];

    updateCard(swarmNode.id, { agentGroupAgents: next });
  };

  const restoreDefaultRoster = () => {
    if (!swarmNode) return;
    updateCard(swarmNode.id, {
      agentGroupAgents: defaultRoster.length > 0 ? defaultRoster : DEFAULT_INVESTIGATION_PROFILE_NAMES,
    });
  };

  if (!isAiWorkspace) {
    return (
      <div style={{
        width: 320,
        height: '100%',
        background: '#131318',
        borderLeft: '1px solid #222',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        fontFamily: 'IBM Plex Sans, sans-serif',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          height: 40,
          borderBottom: '1px solid #222',
          background: '#181820',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#ddd', letterSpacing: '0.02em' }}>
            Investigation Agents
          </span>
          <button
            onClick={() => setAgentSidebarOpen(false)}
            style={{ padding: '3px 6px', color: '#444', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 3 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ccc'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#444'; }}
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="8" y2="8" />
              <line x1="8" y1="1" x2="1" y2="8" />
            </svg>
          </button>
        </div>

        <div style={{ padding: 14, color: '#888', fontSize: 12, lineHeight: 1.6 }}>
          Open the AI Investigation workspace to manage the prebuilt investigation swarm and add markdown-backed agents.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: 320,
      height: '100%',
      background: '#131318',
      borderLeft: '1px solid #222',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      fontFamily: 'IBM Plex Sans, sans-serif',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        height: 40,
        borderBottom: '1px solid #222',
        background: '#181820',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#ddd', letterSpacing: '0.02em' }}>
            Investigation Agents
          </span>
          <span style={{
            fontSize: 8,
            padding: '1px 5px',
            background: '#1a1a2a',
            color: '#7ab3e8',
            border: '1px solid #2a2a4a',
            borderRadius: 3,
            fontFamily: 'IBM Plex Mono',
            letterSpacing: '0.06em',
          }}>
            {activeAgentNames.length} ACTIVE
          </span>
        </div>
        <button
          onClick={() => setAgentSidebarOpen(false)}
          style={{ padding: '3px 6px', color: '#444', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 3 }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ccc'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#444'; }}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="1" y1="1" x2="8" y2="8" />
            <line x1="8" y1="1" x2="1" y2="8" />
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          padding: '10px 11px',
          background: '#10151d',
          border: '1px solid #1f3246',
          borderRadius: 7,
        }}>
          <div style={{ fontSize: 9, color: '#7ab3e8', fontFamily: 'IBM Plex Mono', letterSpacing: '0.08em', marginBottom: 6 }}>
            PREBUILT INVESTIGATION FLOW
          </div>
          <div style={{ fontSize: 11, color: '#bbb', lineHeight: 1.6 }}>
            Paste JSON into the Data Card, add your prompt in the Question Card, review the preview, then continue. All discovered markdown agents are auto-attached by default; use this panel only to narrow the roster.
          </div>
        </div>

        {!swarmNode && (
          <div style={{
            padding: '10px 11px',
            background: '#1a1212',
            border: '1px solid #3a1f1f',
            borderRadius: 7,
          }}>
            <div style={{ fontSize: 11, color: '#f1b0b0', lineHeight: 1.6, marginBottom: 8 }}>
              The Investigation Swarm card is missing from this AI workspace.
            </div>
            <button
              onClick={() => clearWorkspace()}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: '#251010',
                border: '1px solid #4a1a1a',
                borderRadius: 5,
                color: '#f87171',
                fontSize: 10,
                fontFamily: 'IBM Plex Mono',
                cursor: 'pointer',
              }}
            >
              RESET DEFAULT AI WORKFLOW
            </button>
          </div>
        )}

        {swarmNode && (
          <div style={{
            padding: '10px 11px',
            background: '#111',
            border: '1px solid #222',
            borderRadius: 7,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 9, color: '#666', fontFamily: 'IBM Plex Mono', letterSpacing: '0.08em' }}>
                  ACTIVE SWARM
                </div>
                <div style={{ fontSize: 12, color: '#ddd', marginTop: 2 }}>
                  {swarmNode.data.title || 'Investigation Swarm'}
                </div>
              </div>
              <button
                onClick={restoreDefaultRoster}
                style={{
                  padding: '4px 7px',
                  background: '#13253a',
                  border: '1px solid #2a4a7a',
                  borderRadius: 4,
                  color: '#7ab3e8',
                  fontSize: 8,
                  fontFamily: 'IBM Plex Mono',
                  cursor: 'pointer',
                }}
              >
                RESET DEFAULTS
              </button>
            </div>

            {activeProfiles.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {activeProfiles.map((profile) => (
                  <span
                    key={profile.id}
                    style={{
                      padding: '3px 7px',
                      borderRadius: 10,
                      background: '#151d29',
                      border: '1px solid #243349',
                      color: '#b9d8f5',
                      fontSize: 9,
                      fontFamily: 'IBM Plex Mono',
                    }}
                  >
                    {profile.codename}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: '#777', lineHeight: 1.5 }}>
                No explicit roster selected. The swarm will auto-attach all available markdown agents.
              </div>
            )}
          </div>
        )}

        {loading && (
          <div style={{ fontSize: 11, color: '#777', lineHeight: 1.6 }}>
            Loading agent profiles from the Python backend...
          </div>
        )}

        {error && (
          <div style={{
            padding: '10px 11px',
            background: '#1a1212',
            border: '1px solid #3a1f1f',
            borderRadius: 7,
            fontSize: 11,
            color: '#f1b0b0',
            lineHeight: 1.6,
          }}>
            {error}
          </div>
        )}

        {!loading && groupedProfiles.map(([category, categoryProfiles]) => (
          <div key={category}>
            <div style={{
              fontSize: 9,
              color: getCategoryColor(category),
              fontFamily: 'IBM Plex Mono',
              letterSpacing: '0.08em',
              marginBottom: 6,
            }}>
              {category.toUpperCase()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {categoryProfiles.map((profile) => {
                const active = activeAgentNames.includes(profile.name) || activeAgentNames.includes(profile.codename);
                const isDefault = DEFAULT_INVESTIGATION_PROFILE_NAMES.includes(profile.name);

                return (
                  <div
                    key={profile.id}
                    style={{
                      padding: '8px 9px',
                      background: active ? '#111826' : '#151520',
                      border: `1px solid ${active ? '#2a4a7a' : '#1f1f2b'}`,
                      borderRadius: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: '#ddd', fontWeight: 600 }}>
                            {profile.codename}
                          </span>
                          {isDefault && (
                            <span style={{
                              fontSize: 7,
                              padding: '1px 4px',
                              background: '#0f1b2a',
                              color: '#7ab3e8',
                              border: '1px solid #1f3246',
                              borderRadius: 3,
                              fontFamily: 'IBM Plex Mono',
                            }}>
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                          {profile.title}
                        </div>
                        <div style={{ fontSize: 9, color: '#666', fontFamily: 'IBM Plex Mono', marginTop: 4 }}>
                          {profile.role}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <button
                          onClick={() => toggleProfile(profile)}
                          disabled={!swarmNode}
                          style={{
                            padding: '4px 7px',
                            background: active ? '#13253a' : '#111',
                            border: `1px solid ${active ? '#2a4a7a' : '#2a2a2a'}`,
                            borderRadius: 4,
                            color: active ? '#7ab3e8' : '#888',
                            fontSize: 8,
                            fontFamily: 'IBM Plex Mono',
                            cursor: swarmNode ? 'pointer' : 'default',
                          }}
                        >
                          {active ? 'ACTIVE' : 'USE'}
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: 10, color: '#777', lineHeight: 1.55, marginTop: 7 }}>
                      {profile.personality.slice(0, 160)}
                      {profile.personality.length > 160 ? '...' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
