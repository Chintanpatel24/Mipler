import React, { useMemo, useState } from 'react';
import { BaseCard } from './BaseCard';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { apiService } from '../../services/api';
import { restartAiWorkflowExecution } from '../../services/aiWorkflowRunner';
import type { CardData, InvestigationPreviewData } from '../../types';
import {
  buildInvestigationIntake,
  PREVIEW_PROFILE_NAMES,
} from '../../utils/investigationFlow';

export const InvestigationPreviewCard: React.FC<{ id: string; data: CardData }> = ({ id, data }) => {
  const updateCard = useWorkspaceStore((s) => s.updateCard);
  const nodes = useWorkspaceStore((s) => s.nodes);
  const [building, setBuilding] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [asking, setAsking] = useState(false);

  const intake = useMemo(() => buildInvestigationIntake(nodes), [nodes]);
  const preview = data.previewData;
  const isCurrent = !!preview && preview.sourceSignature === intake.signature;
  const isApproved = data.workflowConfig?.previewApprovedSignature === intake.signature;
  const canContinue = !!preview && isCurrent && preview.readyToContinue;

  const savePreview = (previewData: InvestigationPreviewData) => {
    updateCard(id, {
      previewData,
      content: previewData.structureOverview,
      executionStatus: 'success',
      executionOutput: [previewData.structureOverview, previewData.continuePrompt].filter(Boolean).join('\n\n'),
      workflowConfig: {
        ...(data.workflowConfig || {}),
        previewApprovedSignature: '',
      },
    });
  };

  const buildPreview = async () => {
    setBuilding(true);
    updateCard(id, {
      executionStatus: 'running',
      executionOutput: 'Building investigation structure preview...',
      workflowConfig: {
        ...(data.workflowConfig || {}),
        previewApprovedSignature: '',
      },
    });

    try {
      const result = await apiService.previewInvestigation(
        intake.rawData,
        intake.question,
        PREVIEW_PROFILE_NAMES,
      );

      savePreview({
        ...result.preview,
        sourceSignature: intake.signature,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      updateCard(id, {
        executionStatus: 'error',
        executionOutput: `Preview error: ${message}`,
      });
    } finally {
      setBuilding(false);
    }
  };

  const continueInvestigation = async () => {
    if (!preview || !isCurrent || !preview.readyToContinue) return;

    setContinuing(true);

    const store = useWorkspaceStore.getState();
    const agentGroup = store.nodes.find((node) => node.data.cardType === 'agent-group');
    if (agentGroup) {
      store.updateCard(agentGroup.id, {
        agentGroupAgents: [],
        agentGroupStrategy: 'parallel',
      });
    }

    updateCard(id, {
      workflowConfig: {
        ...(data.workflowConfig || {}),
        previewApprovedSignature: intake.signature,
      },
      executionOutput: `${preview.continuePrompt}\n\nLaunching investigation swarm...`,
    });

    try {
      await restartAiWorkflowExecution();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      updateCard(id, {
        executionStatus: 'error',
        executionOutput: `Unable to continue: ${message}`,
        workflowConfig: {
          ...(data.workflowConfig || {}),
          previewApprovedSignature: '',
        },
      });
    } finally {
      setContinuing(false);
    }
  };

  const askCaseQuestions = async () => {
    setAsking(true);
    try {
      const payloadText = JSON.stringify({ raw_data: intake.rawData, question: intake.question }).slice(0, 14000);
      const result = await apiService.analyzeCase({
        user_id: 'default-user',
        session_id: `case-${Date.now()}`,
        case_text: payloadText,
      });

      const generated = (result.clarifying_questions || []).filter((q) => typeof q === 'string').slice(0, 7);
      const scenario = result.scenario_summary || '';

      const questionNode = nodes.find((node) => node.data.cardType === 'question-card');
      if (questionNode) {
        const firstQuestion = generated[0] || questionNode.data.questionText || 'What should we verify first in this case?';
        useWorkspaceStore.getState().updateCard(questionNode.id, {
          questionText: firstQuestion,
          content: [firstQuestion, ...generated.slice(1)].join('\n'),
        });
      }

      updateCard(id, {
        executionOutput: [
          'Scenario understanding complete.',
          scenario,
          '',
          'Clarifying questions:',
          ...generated.map((q) => `- ${q}`),
        ].join('\n').slice(0, 5000),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      updateCard(id, {
        executionStatus: 'error',
        executionOutput: `Case-question generation failed: ${message}`,
      });
    } finally {
      setAsking(false);
    }
  };

  return (
    <BaseCard
      id={id}
      title={data.title || 'Investigation Preview'}
      width={data.width || 420}
      cardColor={data.cardColor || '#10202a'}
      onTitleChange={(title) => updateCard(id, { title })}
      headerExtra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 8, padding: '1px 6px', background: '#0c2430',
            border: '1px solid #21465e', borderRadius: 3, color: '#77b7e5',
            fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em',
          }}>
            PREVIEW
          </span>
          <span style={{
            fontSize: 8, padding: '1px 6px',
            background: isApproved ? '#102b18' : isCurrent ? '#1a1a0a' : '#111',
            border: `1px solid ${isApproved ? '#2a6a3a' : isCurrent ? '#5a5a2a' : '#2a2a2a'}`,
            borderRadius: 3,
            color: isApproved ? '#5acc7a' : isCurrent ? '#eab308' : '#666',
            fontFamily: 'IBM Plex Mono',
          }}>
            {isApproved ? 'APPROVED' : isCurrent ? 'READY' : 'STALE'}
          </span>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          padding: '8px', background: '#09141b',
          border: '1px solid #173241', borderRadius: 4,
          fontSize: 10, color: '#89a8bf', lineHeight: 1.5,
        }}>
          Intake: {intake.summary}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={askCaseQuestions}
            disabled={asking}
            style={{
              flex: 1, padding: '9px 10px', borderRadius: 5,
              border: '1px solid #315b7a', background: asking ? '#101c25' : '#122737',
              color: asking ? '#637d90' : '#8cc7ef',
              cursor: asking ? 'default' : 'pointer',
              fontFamily: 'IBM Plex Sans', fontSize: 11, fontWeight: 600,
            }}
          >
            {asking ? 'Analyzing Case...' : 'Ask Case Questions'}
          </button>
          <button
            onClick={buildPreview}
            disabled={building}
            style={{
              flex: 1, padding: '9px 10px', borderRadius: 5,
              border: '1px solid #2a5b79', background: building ? '#13212b' : '#123247',
              color: building ? '#6d8a9e' : '#89c5f0', cursor: building ? 'default' : 'pointer',
              fontFamily: 'IBM Plex Sans', fontSize: 11, fontWeight: 600,
            }}
          >
            {building ? 'Building Preview...' : 'Build Preview'}
          </button>
          <button
            onClick={continueInvestigation}
            disabled={continuing || !canContinue}
            style={{
              flex: 1, padding: '9px 10px', borderRadius: 5,
              border: '1px solid #2a6a3a', background: continuing ? '#122018' : '#102917',
              color: continuing || !canContinue ? '#5b7262' : '#7bd996',
              cursor: continuing || !canContinue ? 'default' : 'pointer',
              fontFamily: 'IBM Plex Sans', fontSize: 11, fontWeight: 600,
            }}
          >
            {continuing ? 'Launching...' : 'Continue Investigation'}
          </button>
        </div>

        {!preview || !isCurrent ? (
          <div style={{
            padding: '10px', background: '#0a0f14',
            border: '1px solid #151d24', borderRadius: 4,
            fontSize: 10, color: '#667785', lineHeight: 1.6,
          }}>
            Build the preview after updating the intake JSON or the question. The preview agents will outline the case structure, assumptions, likely entities, and the recommended specialist roster before the swarm runs.
          </div>
        ) : (
          <>
            <div style={{
              padding: '10px', background: '#0b141a',
              border: '1px solid #17242d', borderRadius: 4,
              fontSize: 11, color: '#c7d7e2', lineHeight: 1.6,
            }}>
              <div style={{ fontSize: 12, color: '#89c5f0', marginBottom: 4 }}>{preview.caseLabel || 'Investigation Preview'}</div>
              <div>{preview.structureOverview}</div>
            </div>

            {preview.objective && (
              <div style={{ fontSize: 10, color: '#9eb6c7', lineHeight: 1.6 }}>
                Objective: {preview.objective}
              </div>
            )}

            {preview.simulationFocus && (
              <div style={{ fontSize: 10, color: '#8fc0a6', lineHeight: 1.6 }}>
                Simulation Focus: {preview.simulationFocus}
              </div>
            )}

            {preview.topLevelKeys.length > 0 && (
              <div>
                <label style={{ fontSize: 8, color: '#5d7382', fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
                  TOP LEVEL KEYS
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {preview.topLevelKeys.map((key) => (
                    <span key={key} style={{
                      fontSize: 8, padding: '2px 6px', borderRadius: 999,
                      background: '#0c1a22', border: '1px solid #173241', color: '#7ea7c1',
                      fontFamily: 'IBM Plex Mono',
                    }}>
                      {key}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {preview.entities.length > 0 && (
              <div>
                <label style={{ fontSize: 8, color: '#5d7382', fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
                  INFERRED ENTITIES
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {preview.entities.slice(0, 8).map((entity) => (
                    <div key={`${entity.name}-${entity.type}`} style={{
                      padding: '6px 8px', background: '#0b141a',
                      border: '1px solid #17242d', borderRadius: 4,
                    }}>
                      <div style={{ fontSize: 10, color: '#c7d7e2' }}>{entity.name}</div>
                      <div style={{ fontSize: 9, color: '#8aa0b0', marginTop: 2 }}>{entity.type} | {entity.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {([
              ['Relationships', preview.relationships],
              ['Timeline', preview.timeline],
              ['Hypotheses', preview.hypotheses],
              ['Assumptions', preview.assumptions],
              ['Gaps', preview.gaps],
            ] as Array<[string, string[]]>).map(([label, items]) => (
              Array.isArray(items) && items.length > 0 ? (
                <div key={label}>
                  <label style={{ fontSize: 8, color: '#5d7382', fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
                    {label.toUpperCase()}
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {items.slice(0, 8).map((item) => (
                      <div key={item} style={{ fontSize: 10, color: '#aabccc', lineHeight: 1.5 }}>
                        • {item}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            ))}

            {preview.recommendedAgents.length > 0 && (
              <div>
                <label style={{ fontSize: 8, color: '#5d7382', fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
                  RECOMMENDED AGENTS
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {preview.recommendedAgents.map((agent) => (
                    <span key={agent} style={{
                      fontSize: 8, padding: '2px 6px', borderRadius: 999,
                      background: '#102917', border: '1px solid #2a6a3a', color: '#7bd996',
                      fontFamily: 'IBM Plex Mono',
                    }}>
                      {agent}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{
              padding: '8px', background: '#0a1116',
              border: '1px solid #18232c', borderRadius: 4,
              fontSize: 10, color: '#90a7b8', lineHeight: 1.6,
            }}>
              {preview.continuePrompt}
            </div>
            {!preview.readyToContinue && (
              <div style={{ fontSize: 10, color: '#d4b26a', lineHeight: 1.5 }}>
                Edit the intake or question, then rebuild the preview before continuing.
              </div>
            )}
          </>
        )}
      </div>
    </BaseCard>
  );
};
