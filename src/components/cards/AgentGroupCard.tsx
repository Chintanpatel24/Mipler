import React, { useEffect, useState } from 'react';
import { BaseCard } from './BaseCard';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import type { CardData, MiplerEdge, MiplerNode } from '../../types';
import { apiService, type AgentProfile } from '../../services/api';
import { DEFAULT_INVESTIGATION_PROFILE_NAMES } from '../../utils/investigationFlow';

const DEFAULT_AGENTS: Array<{ name: string; role: string; personality: string; color: string }> = [
  { name: 'Researcher', role: 'researcher', personality: 'You are a thorough researcher. Analyze data carefully, find patterns, and provide evidence-based conclusions. Be specific and cite data.', color: '#1a2a4a' },
  { name: 'Analyst', role: 'analyst', personality: 'You are a data analyst. Focus on metrics, trends, and quantitative insights. Present findings clearly with numbers.', color: '#2a1a3a' },
  { name: 'Investigator', role: 'investigator', personality: 'You are an OSINT investigator. Follow leads, connect dots, and uncover hidden relationships. Think like a detective.', color: '#1a3a2a' },
  { name: 'Validator', role: 'validator', personality: 'You are a fact-checker. Verify claims, cross-reference sources, and flag inconsistencies. Be skeptical and thorough.', color: '#3a2a1a' },
];

function buildGraphContext(nodes: MiplerNode[], edges: MiplerEdge[]): Record<string, unknown> {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      title: node.data.title || node.id,
      card_type: node.data.cardType,
    })),
    edges: edges.map((edge) => ({
      source: nodeMap.get(edge.source)?.data.title || edge.source,
      target: nodeMap.get(edge.target)?.data.title || edge.target,
    })),
  };
}

export const AgentGroupCard: React.FC<{ id: string; data: CardData }> = ({ id, data }) => {
  const updateCard = useWorkspaceStore((s) => s.updateCard);
  const nodes = useWorkspaceStore((s) => s.nodes);
  const edges = useWorkspaceStore((s) => s.edges);
  const startDataFlow = useWorkspaceStore((s) => s.startDataFlow);
  const stopDataFlow = useWorkspaceStore((s) => s.stopDataFlow);

  const [running, setRunning] = useState(false);
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);

  const isLight = data.cardColor === '#ffffff' || data.cardColor === '#f5f5f0';
  const textColor = isLight ? '#2a2a2a' : '#cccccc';
  const mutedColor = isLight ? '#888' : '#555';

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

  const fallbackAgents = profiles.length > 0
    ? profiles.map((profile) => profile.name)
    : DEFAULT_AGENTS.map((agent) => agent.name);
  const agents = data.agentGroupAgents && data.agentGroupAgents.length > 0 ? data.agentGroupAgents : fallbackAgents;
  const strategy = data.agentGroupStrategy || 'parallel';
  const allowWebSearch = !!data.workflowConfig?.allowWebSearch;

  const runAgentGroup = async () => {
    setRunning(true);
    updateCard(id, { executionStatus: 'running' });

    // Animate connected edges
    const connectedEdgeIds = edges.filter(e => e.source === id || e.target === id).map(e => e.id);
    startDataFlow(connectedEdgeIds);

    try {
      // Collect data from upstream connections
      const inputEdges = edges.filter(e => e.target === id);
      let inputData = '';

      for (const edge of inputEdges) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        if (sourceNode) {
          if (sourceNode.data.executionOutput) {
            inputData += `[${sourceNode.data.title}]: ${sourceNode.data.executionOutput.slice(0, 3000)}\n\n`;
          } else if (sourceNode.data.content) {
            inputData += `[${sourceNode.data.title}]: ${sourceNode.data.content.slice(0, 3000)}\n\n`;
          } else if (sourceNode.data.importedFiles?.length) {
            const fileData = sourceNode.data.importedFiles.map(f => {
              const d = typeof f.data === 'string' ? f.data.slice(0, 2000) : JSON.stringify(f.data).slice(0, 2000);
              return `File: ${f.name}\n${d}`;
            }).join('\n\n');
            inputData += `[Files from ${sourceNode.data.title}]:\n${fileData}\n\n`;
          } else if (sourceNode.data.agentConfig?.lastOutput) {
            inputData += `[Agent ${sourceNode.data.title}]: ${sourceNode.data.agentConfig.lastOutput.slice(0, 2000)}\n\n`;
          }
        }
      }

      if (!inputData) {
        throw new Error('No evidence connected. Import or connect case material before running the agent group.');
      }

      updateCard(id, {
        executionOutput: `Dispatching ${agents.length} Python agents...`,
        agentGroupStrategy: strategy,
      });

      const selectedProfiles = agents.map((agentName) => {
        const profile = profiles.find((item) => item.name === agentName || item.codename === agentName);
        if (profile) {
          return {
            name: profile.codename,
            role: profile.role,
            personality: profile.prompt,
            behavior: profile.behavior,
            profile_name: profile.name,
            internet_access: allowWebSearch,
            response_style: 'options-only',
          };
        }

        const fallback = DEFAULT_AGENTS.find((item) => item.name === agentName);
        return {
          name: agentName,
          role: fallback?.role || 'analyst',
          personality: fallback?.personality || 'You are a helpful investigation agent.',
          behavior: '',
          internet_access: allowWebSearch,
          response_style: 'options-only',
        };
      });

      const runResult = await apiService.runSwarm(
        data.content || 'Analyze the connected evidence, coordinate the specialists, and produce an investigation simulation.',
        selectedProfiles,
        strategy,
        { evidence: inputData },
        buildGraphContext(nodes, edges),
      );

      const synthesis = runResult.consensus.summary || 'Synthesis unavailable';
      const output = JSON.stringify(runResult, null, 2);

      updateCard(id, {
        executionStatus: 'success',
        executionOutput: output.slice(0, 5000),
        content: synthesis.slice(0, 2000),
        agentGroupStrategy: strategy,
      });

      // Propagate to downstream cards
      const outputEdges = edges.filter(e => e.source === id);
      for (const edge of outputEdges) {
        const targetNode = nodes.find(n => n.id === edge.target);
        if (targetNode?.data.cardType === 'report-agent') {
          const findings = Object.values(runResult.agent_results).map((result) => result.result.slice(0, 300));
          useWorkspaceStore.getState().updateCard(edge.target, {
            reportData: {
              summary: synthesis.slice(0, 1000),
              findings,
              sources: Object.values(runResult.agent_results).map((result) => result.name),
              confidence: typeof runResult.consensus.simulation?.confidence === 'number'
                ? Math.max(0, Math.min(1, runResult.consensus.simulation.confidence / 100))
                : 0.75,
              generatedAt: new Date().toISOString(),
              threatLevel: runResult.consensus.threat_level || 'medium',
              questionAnswer: runResult.consensus.question_answer || '',
              simulation: runResult.consensus.simulation
                ? {
                    scenario: runResult.consensus.simulation.scenario || '',
                    forecast: runResult.consensus.simulation.forecast || '',
                    assumptions: runResult.consensus.simulation.assumptions || [],
                    confidence: runResult.consensus.simulation.confidence || 0,
                  }
                : undefined,
            },
            content: synthesis.slice(0, 500),
            executionOutput: synthesis.slice(0, 3000),
            executionStatus: 'success',
          });
        } else if (targetNode?.data.cardType === 'agent-answer') {
          useWorkspaceStore.getState().updateCard(edge.target, {
            answerText: synthesis,
            content: synthesis.slice(0, 500),
            executionOutput: synthesis.slice(0, 3000),
            executionStatus: 'success',
            answerStatus: 'positive',
          });
        }
      }

    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      updateCard(id, {
        executionStatus: 'error',
        executionOutput: `Error: ${message}`,
      });
    }

    setRunning(false);
    stopDataFlow();
  };

  return (
    <BaseCard
      id={id}
      title={data.title || 'Agent Group'}
      width={data.width || 400}
      cardColor={data.cardColor || '#1a1a3a'}
      onTitleChange={(t) => updateCard(id, { title: t })}
      headerExtra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 7, padding: '1px 5px', background: '#1a1a2a',
            border: '1px solid #2a2a4a', borderRadius: 3, color: '#9a9af0',
            fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em',
          }}>GROUP</span>
          <span style={{
            fontSize: 7, padding: '1px 4px', background: '#1a1a2a',
            border: '1px solid #2a2a3a', borderRadius: 3, color: '#7a7af0',
            fontFamily: 'IBM Plex Mono',
          }}>
            {agents.length} agents
          </span>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Strategy selector */}
        <div>
          <label style={{ fontSize: 9, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
            STRATEGY
          </label>
          <div style={{ display: 'flex', gap: 3 }}>
            {(['pipeline', 'parallel', 'debate'] as const).map(s => (
              <button
                key={s}
                onClick={() => updateCard(id, { agentGroupStrategy: s })}
                style={{
                  flex: 1, padding: '4px 6px', borderRadius: 4,
                  background: strategy === s ? '#1a1a3a' : '#111',
                  border: `1px solid ${strategy === s ? '#2a2a5a' : '#222'}`,
                  color: strategy === s ? '#9a9af0' : '#555',
                  fontSize: 9, cursor: 'pointer', fontFamily: 'IBM Plex Mono',
                  textTransform: 'capitalize',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Agents list */}
        <div>
          <label style={{ fontSize: 9, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
            AGENTS
          </label>
          {agents.map((agentName, i) => {
            const profile = profiles.find((item) => item.name === agentName || item.codename === agentName);
            const agentDef = DEFAULT_AGENTS.find(a => a.name === agentName);
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 6px', background: '#0f0f1a',
                border: '1px solid #1a1a2a', borderRadius: 3, marginBottom: 2,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: agentDef?.color || '#333', flexShrink: 0,
                }} />
                <span style={{ flex: 1, fontSize: 10, color: textColor }}>{profile?.codename || agentName}</span>
                <span style={{ fontSize: 8, color: '#444', fontFamily: 'IBM Plex Mono' }}>
                  {profile?.role || agentDef?.role || 'assistant'}
                </span>
              </div>
            );
          })}
        </div>

        {profiles.length > 0 && (
          <div>
            <label style={{ fontSize: 9, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
              PROFILE ROSTER
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
              {profiles.map((profile) => {
                const active = agents.includes(profile.name);
                return (
                  <button
                    key={profile.id}
                    onClick={() => {
                      const next = active
                        ? agents.filter((item) => item !== profile.name)
                        : [...agents, profile.name];
                      updateCard(id, { agentGroupAgents: next });
                    }}
                    style={{
                      padding: '3px 7px', borderRadius: 10,
                      background: active ? '#13253a' : '#151515',
                      border: `1px solid ${active ? '#2a4a7a' : '#222'}`,
                      color: active ? '#7ab3e8' : '#555',
                      fontSize: 9, cursor: 'pointer', fontFamily: 'IBM Plex Mono',
                    }}
                    title={profile.title}
                  >
                    {profile.codename}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Internet access toggle for swarm */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 8px', background: '#111', border: '1px solid #222', borderRadius: 4,
        }}>
          <div>
            <span style={{ fontSize: 11, color: textColor, fontFamily: 'IBM Plex Sans' }}>
              Internet Access
            </span>
            <span style={{ fontSize: 9, color: mutedColor, display: 'block', marginTop: 1, fontFamily: 'IBM Plex Mono' }}>
              Allow swarm web search
            </span>
          </div>
          <button
            onClick={() => updateCard(id, {
              workflowConfig: {
                ...(data.workflowConfig || {}),
                allowWebSearch: !allowWebSearch,
              },
            })}
            style={{
              width: 36, height: 20, borderRadius: 10,
              background: allowWebSearch ? '#1a3a2a' : '#222',
              border: `1px solid ${allowWebSearch ? '#2a6a3a' : '#333'}`,
              cursor: 'pointer', position: 'relative', transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              background: allowWebSearch ? '#5acc7a' : '#555',
              position: 'absolute', top: 2,
              left: allowWebSearch ? 18 : 3,
              transition: 'all 0.15s',
            }} />
          </button>
        </div>

        {/* Run button */}
        <button
          onClick={runAgentGroup}
          disabled={running || agents.length === 0}
          style={{
            padding: '10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
            cursor: (running || agents.length === 0) ? 'default' : 'pointer',
            background: running ? '#1a1a2a' : '#1a2a4a',
            border: `1px solid ${running ? '#2a2a3a' : '#2a4a7a'}`,
            color: (running || agents.length === 0) ? '#555' : '#7ab3e8',
            fontFamily: 'IBM Plex Sans',
          }}
        >
          {running ? '⟳ Agents working...' : agents.length === 0 ? 'Select agent profiles first' : `▶ Run ${agents.length} Agents (${strategy})`}
        </button>

        {/* Output */}
        {data.executionOutput && (
          <div>
            <label style={{ fontSize: 9, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
              OUTPUT
            </label>
            <div style={{
              padding: '8px', background: '#0a0a0a',
              border: '1px solid #1e1e1e', borderRadius: 4,
              fontSize: 9, color: '#888', lineHeight: 1.5,
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
