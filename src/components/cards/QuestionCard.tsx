import React, { useState } from 'react';
import { BaseCard } from './BaseCard';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { restartAiWorkflowExecution } from '../../services/aiWorkflowRunner';
import type { CardData } from '../../types';

export const QuestionCard: React.FC<{ id: string; data: CardData }> = ({ id, data }) => {
  const updateCard = useWorkspaceStore((s) => s.updateCard);
  const [running, setRunning] = useState(false);

  const isLight = data.cardColor === '#ffffff' || data.cardColor === '#f5f5f0';
  const textColor = isLight ? '#2a2a2a' : '#cccccc';
  const mutedColor = isLight ? '#888' : '#555';

  const askQuestion = async () => {
    const question = data.questionText || data.content;
    if (!question.trim()) return;

    const storeForMode = useWorkspaceStore.getState();
    const active = storeForMode.getActiveInvestigation();
    if (active?.isAiAnalysis) {
      setRunning(true);
      updateCard(id, { executionStatus: 'running', answerStatus: 'pending' });
      try {
        await restartAiWorkflowExecution();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        updateCard(id, {
          answerText: `Error: ${msg}`,
          answerStatus: 'negative',
          executionStatus: 'error',
          executionOutput: msg,
        });
      }
      setRunning(false);
      return;
    }

    setRunning(true);
    updateCard(id, { executionStatus: 'running', answerStatus: 'pending' });

    try {
      const store = useWorkspaceStore.getState();
      const url = (store.llmBaseUrl || 'http://localhost:11434') + '/api/chat';

      // Collect context from connected cards via edges
      const edges = store.edges.filter(e => e.target === id);
      const contextParts: string[] = [];

      for (const edge of edges) {
        const sourceNode = store.nodes.find(n => n.id === edge.source);
        if (sourceNode) {
          if (sourceNode.data.executionOutput) {
            contextParts.push(`[${sourceNode.data.title}]: ${sourceNode.data.executionOutput.slice(0, 3000)}`);
          } else if (sourceNode.data.content) {
            contextParts.push(`[${sourceNode.data.title}]: ${sourceNode.data.content.slice(0, 3000)}`);
          } else if (sourceNode.data.reportData) {
            contextParts.push(`[Report: ${sourceNode.data.title}]: ${sourceNode.data.reportData.summary}`);
          } else if (sourceNode.data.agentConfig?.lastOutput) {
            contextParts.push(`[Agent ${sourceNode.data.title}]: ${sourceNode.data.agentConfig.lastOutput.slice(0, 3000)}`);
          } else if (sourceNode.data.importedFiles?.length) {
            const fileData = sourceNode.data.importedFiles.map(f => {
              const d = typeof f.data === 'string' ? f.data.slice(0, 1500) : JSON.stringify(f.data).slice(0, 1500);
              return `File: ${f.name}\n${d}`;
            }).join('\n\n');
            contextParts.push(`[Data from ${sourceNode.data.title}]:\n${fileData}`);
          }
        }
      }

      const contextBlock = contextParts.length > 0
        ? `\n\nCONTEXT FROM CONNECTED CARDS:\n${contextParts.join('\n---\n')}\n\nBased on the above context, `
        : '\n\n';

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: store.llmModel || 'qwen2.5:0.5b',
          messages: [
            { role: 'system', content: 'You are a helpful investigation assistant. Answer the user\'s question based on the provided context. Be thorough, specific, and evidence-based. If the context contains relevant data, reference it directly.' },
            { role: 'user', content: `${contextBlock}Question: ${question}` },
          ],
          stream: false,
        }),
      });

      if (!res.ok) throw new Error(`Ollama error ${res.status}`);
      const result = await res.json();
      const answer = result.message?.content || result.response || 'No answer received.';

      const isPositive = !answer.toLowerCase().includes('not found') && !answer.toLowerCase().includes('no data');
      updateCard(id, {
        answerText: answer,
        answerStatus: isPositive ? 'positive' : 'neutral',
        executionStatus: 'success',
        executionOutput: answer.slice(0, 5000),
        content: question,
      });
    } catch (e: any) {
      updateCard(id, {
        answerText: `Error: ${e.message}`,
        answerStatus: 'negative',
        executionStatus: 'error',
        executionOutput: e.message,
      });
    }
    setRunning(false);

  };

  return (
    <BaseCard
      id={id}
      title={data.title || 'Question'}
      width={data.width || 380}
      cardColor={data.cardColor || '#2a2a1a'}
      onTitleChange={(t) => updateCard(id, { title: t })}
      headerExtra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 7, padding: '1px 5px', background: '#2a2a0a',
            border: '1px solid #4a4a1a', borderRadius: 3, color: '#d4a800',
            fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em',
          }}>Q&A</span>
          {data.answerStatus && data.answerStatus !== 'pending' && (
            <span style={{
              fontSize: 7, padding: '1px 4px',
              background: data.answerStatus === 'positive' ? '#0a2a1a' : data.answerStatus === 'negative' ? '#2a0a0a' : '#1a1a1a',
              border: `1px solid ${data.answerStatus === 'positive' ? '#1a4a2a' : data.answerStatus === 'negative' ? '#4a1a1a' : '#333'}`,
              borderRadius: 3,
              color: data.answerStatus === 'positive' ? '#5acc7a' : data.answerStatus === 'negative' ? '#f87171' : '#888',
              fontFamily: 'IBM Plex Mono',
            }}>
              {data.answerStatus === 'positive' ? 'ANSWERED' : data.answerStatus === 'negative' ? 'NO DATA' : 'DONE'}
            </span>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <label style={{ fontSize: 9, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
            YOUR QUESTION
          </label>
          <textarea
            value={data.questionText || data.content}
            onChange={(e) => updateCard(id, { questionText: e.target.value, content: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!running && (data.questionText || data.content)?.trim()) {
                  void askQuestion();
                }
              }
            }}
            placeholder="Ask a question about the connected data...\ne.g. 'What are the main findings?', 'Who are the key entities?'"
            rows={3}
            style={{
              width: '100%', padding: '8px 10px', background: '#111',
              border: '1px solid #2a2a1a', borderRadius: 4,
              fontSize: 12, color: textColor, outline: 'none', resize: 'vertical',
              fontFamily: 'IBM Plex Sans', lineHeight: 1.5,
              boxSizing: 'border-box' as const,
            }}
          />
        </div>

        <button
          onClick={askQuestion}
          disabled={running || !(data.questionText || data.content)}
          style={{
            padding: '8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
            cursor: running ? 'default' : 'pointer',
            background: running ? '#1a1a0a' : '#2a2a0a',
            border: `1px solid ${running ? '#3a3a1a' : '#4a4a1a'}`,
            color: running ? '#888' : '#d4a800',
            fontFamily: 'IBM Plex Sans',
          }}
        >
          {running ? '⟳ Thinking...' : '⚡ Ask Question'}
        </button>

        {data.answerText && (
          <div>
            <label style={{ fontSize: 9, color: mutedColor, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
              ANSWER
            </label>
            <div style={{
              padding: '10px', background: '#0a0a0a',
              border: '1px solid #1e1e1e', borderRadius: 5,
              fontSize: 11, color: '#bbb', lineHeight: 1.7,
              maxHeight: 200, overflowY: 'auto',
              fontFamily: 'IBM Plex Sans',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {data.answerText}
            </div>
          </div>
        )}
      </div>
    </BaseCard>
  );
};
