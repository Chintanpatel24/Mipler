import React, { useState } from 'react';
import { BaseCard } from './BaseCard';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import type { CardData } from '../../types';

export const CardMakerCard: React.FC<{ id: string; data: CardData }> = ({ id, data }) => {
  const updateCard = useWorkspaceStore((s) => s.updateCard);
  const addCard = useWorkspaceStore((s) => s.addCard);
  const nodes = useWorkspaceStore((s) => s.nodes);
  const edges = useWorkspaceStore((s) => s.edges);
  const [running, setRunning] = useState(false);

  const isLight = data.cardColor === '#ffffff' || data.cardColor === '#f5f5f0';
  const textColor = isLight ? '#2a2a2a' : '#cccccc';
  const mutedColor = isLight ? '#888' : '#555';

  const makeCards = async () => {
    setRunning(true);
    updateCard(id, { executionStatus: 'running' });

    try {
      // Collect data from upstream
      const inputEdges = edges.filter(e => e.target === id);
      let inputData = '';

      for (const edge of inputEdges) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        if (sourceNode) {
          if (sourceNode.data.executionOutput) {
            inputData += sourceNode.data.executionOutput + '\n\n';
          } else if (sourceNode.data.answerText) {
            inputData += sourceNode.data.answerText + '\n\n';
          } else if (sourceNode.data.content) {
            inputData += sourceNode.data.content + '\n\n';
          } else if (sourceNode.data.reportData) {
            inputData += sourceNode.data.reportData.summary + '\n\n';
            inputData += sourceNode.data.reportData.findings.join('\n') + '\n\n';
          }
        }
      }

      if (!inputData.trim()) {
        updateCard(id, { executionStatus: 'error', executionOutput: 'No input data to create cards from' });
        setRunning(false);
        return;
      }

      // Use Ollama to extract topics for cards
      const store = useWorkspaceStore.getState();
      const url = (store.llmBaseUrl || 'http://localhost:11434') + '/api/chat';

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: store.llmModel || 'qwen2.5:0.5b',
          messages: [
            { role: 'system', content: 'Extract the main topics/findings from the text. Return a JSON array of objects with "title" and "content" fields. Max 6 items. Return ONLY valid JSON array, no markdown.' },
            { role: 'user', content: `Extract key topics from:\n\n${inputData.slice(0, 6000)}` },
          ],
          stream: false,
        }),
      });

      let topics: Array<{ title: string; content: string }> = [];

      if (res.ok) {
        const result = await res.json();
        const raw = result.message?.content || result.response || '[]';
        try {
          const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          topics = JSON.parse(cleaned);
        } catch {
          // Fallback: create cards from lines
          const lines = inputData.split('\n').filter(l => l.trim().length > 10);
          topics = lines.slice(0, 5).map(line => ({
            title: line.trim().slice(0, 60),
            content: line.trim(),
          }));
        }
      }

      if (topics.length === 0) {
        topics = [{ title: 'Extracted Data', content: inputData.slice(0, 500) }];
      }

      // Create the cards on canvas
      const nodePos = nodes.find(n => n.id === id)?.position || { x: 500, y: 200 };
      const colors = ['#1a2a4a', '#1a3a2a', '#2a1a3a', '#3a2a1a', '#1a3a3a', '#2a2a1a'];

      topics.slice(0, 6).forEach((topic, i) => {
        addCard('ai-generated', {
          x: nodePos.x + (i % 3) * 340,
          y: nodePos.y + 200 + Math.floor(i / 3) * 200,
        }, {
          title: topic.title?.slice(0, 60) || `Finding ${i + 1}`,
          content: topic.content || '',
          cardColor: colors[i % colors.length],
          isAiGenerated: true,
        });
      });

      updateCard(id, {
        executionStatus: 'success',
        executionOutput: `Created ${Math.min(topics.length, 6)} cards`,
      });

    } catch (e: any) {
      updateCard(id, {
        executionStatus: 'error',
        executionOutput: `Error: ${e.message}`,
      });
    }
    setRunning(false);
  };

  return (
    <BaseCard
      id={id}
      title={data.title || 'Card Maker'}
      width={data.width || 340}
      cardColor={data.cardColor || '#2a1a2a'}
      onTitleChange={(t) => updateCard(id, { title: t })}
      headerExtra={
        <span style={{
          fontSize: 7, padding: '1px 5px', background: '#2a1a2a',
          border: '1px solid #4a2a4a', borderRadius: 3, color: '#e080e0',
          fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em',
        }}>MAKER</span>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 10, color: '#888', lineHeight: 1.5 }}>
          Automatically creates investigation cards from connected data. Connect a Report Agent, Question Card, or Answer Card to this card, then click Make Cards.
        </p>

        <button
          onClick={makeCards}
          disabled={running}
          style={{
            padding: '10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
            cursor: running ? 'default' : 'pointer',
            background: running ? '#1a1a1a' : '#2a1a2a',
            border: `1px solid ${running ? '#2a2a2a' : '#4a2a4a'}`,
            color: running ? '#555' : '#e080e0',
            fontFamily: 'IBM Plex Sans',
          }}
        >
          {running ? '⟳ Creating cards...' : '✨ Make Cards from Data'}
        </button>

        {data.executionOutput && (
          <div style={{
            padding: '6px 8px', background: '#0a0a0a',
            border: '1px solid #1e1e1e', borderRadius: 4,
            fontSize: 9, color: '#888', fontFamily: 'IBM Plex Mono',
          }}>
            {data.executionOutput}
          </div>
        )}
      </div>
    </BaseCard>
  );
};
