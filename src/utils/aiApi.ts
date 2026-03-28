import type { AiMessage } from '../types';

export async function sendAiMessage(
  history: AiMessage[],
  newMessage: string,
  baseUrl?: string,
  model?: string,
): Promise<string> {
  const msgs = history.map(m => ({ role: m.role, content: m.content }));
  msgs.push({ role: 'user', content: newMessage });

  const url = (baseUrl || 'http://localhost:11434') + '/api/chat';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model || 'llama3', messages: msgs, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status} — is Ollama running on ${baseUrl || 'http://localhost:11434'}?`);
  const data = await res.json();
  return data.message?.content || data.response || 'No response';
}

export async function analyzeFilesWithAi(
  question: string,
  files: AnalysisFile[],
  baseUrl?: string,
  model?: string,
): Promise<MindmapResult> {
  const url = (baseUrl || 'http://localhost:11434') + '/api/chat';

  const filesSummary = files.map(f => {
    if (f.type === 'json') {
      return `FILE: ${f.name} (JSON)\nCONTENT:\n${JSON.stringify(f.data, null, 2).slice(0, 4000)}`;
    }
    return `FILE: ${f.name} (${f.type})\nCONTENT:\n${String(f.data).slice(0, 4000)}`;
  }).join('\n\n---\n\n');

  const systemPrompt = `You are an OSINT and data analysis AI. The user has uploaded files and asked a question. 
Analyze the files and answer the question. Then generate a mindmap in JSON format.

Return ONLY valid JSON (no markdown, no backticks) in this exact format:
{
  "answer": "Your detailed answer to the question",
  "mindmap": {
    "root": "Central topic or question",
    "nodes": [
      {
        "id": "1",
        "label": "Main finding or category",
        "children": [
          { "id": "1-1", "label": "Sub point", "children": [] }
        ]
      }
    ]
  }
}`;

  const userMessage = `FILES UPLOADED:\n${filesSummary}\n\nQUESTION: ${question}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || 'llama3',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: false,
    }),
  });

  if (!res.ok) throw new Error(`Ollama error ${res.status} — is Ollama running on ${baseUrl || 'http://localhost:11434'}?`);
  const data = await res.json();
  const raw = data.message?.content || data.response || '{}';

  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as MindmapResult;
  } catch {
    return {
      answer: raw,
      mindmap: {
        root: question,
        nodes: [{ id: '1', label: 'AI response (could not parse mindmap)', children: [] }],
      },
    };
  }
}

export interface AnalysisFile {
  name: string;
  type: string;
  data: unknown;
}

export interface MindmapNode {
  id: string;
  label: string;
  children: MindmapNode[];
}

export interface MindmapResult {
  answer: string;
  mindmap: {
    root: string;
    nodes: MindmapNode[];
  };
}
