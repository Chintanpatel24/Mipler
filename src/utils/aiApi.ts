import type {
  AiMessage,
  InvestigationEntity,
  InvestigationLead,
  InvestigationTimelineEvent,
  MindmapNode,
  MindmapResult,
  PredictionData,
  UploadedFile,
} from '../types';

const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'qwen2.5:0.5b';
const MAX_CHARS_PER_FILE = 3200;
const MAX_TOTAL_PROMPT_CHARS = 18000;

const TEXT_FILE_EXTENSIONS = new Set([
  'csv',
  'env',
  'htm',
  'html',
  'json',
  'log',
  'md',
  'txt',
  'xml',
  'yaml',
  'yml',
]);

const TEXT_FILE_MIME_TYPES = new Set([
  'application/json',
  'application/ld+json',
  'application/xml',
  'application/x-yaml',
  'application/yaml',
]);

type JsonRecord = Record<string, unknown>;
type OllamaMessage = { role: 'system' | 'user' | 'assistant'; content: string };

function resolveBaseUrl(baseUrl?: string): string {
  return (baseUrl || DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, '');
}

function resolveModel(model?: string): string {
  return model || DEFAULT_OLLAMA_MODEL;
}

function ensureText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function toPreviewText(value: unknown, maxLength = MAX_CHARS_PER_FILE): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    return value.slice(0, maxLength);
  }

  try {
    return JSON.stringify(value, null, 2).slice(0, maxLength);
  } catch {
    return String(value).slice(0, maxLength);
  }
}

function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function extractJsonObject(text: string): string | null {
  const cleaned = stripCodeFences(text);

  if (!cleaned.includes('{')) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  let start = -1;

  for (let index = 0; index < cleaned.length; index += 1) {
    const char = cleaned[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        return cleaned.slice(start, index + 1);
      }
    }
  }

  return null;
}

function parseStructuredJson<T>(raw: string): T | null {
  const direct = stripCodeFences(raw);

  try {
    return JSON.parse(direct) as T;
  } catch {
    const extracted = extractJsonObject(raw);
    if (!extracted) {
      return null;
    }

    try {
      return JSON.parse(extracted) as T;
    } catch {
      return null;
    }
  }
}

function clampConfidence(value: unknown): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined;
  }

  if (value > 1 && value <= 100) {
    return Math.max(0, Math.min(1, value / 100));
  }

  return Math.max(0, Math.min(1, value));
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ensureText(item))
    .filter(Boolean);
}

function firstNonEmptyStringArray(...values: unknown[]): string[] {
  for (const value of values) {
    const items = toStringArray(value);
    if (items.length > 0) {
      return items;
    }
  }

  return [];
}

function toEntityArray(value: unknown): InvestigationEntity[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): InvestigationEntity | null => {
      if (typeof item === 'string') {
        return { name: item.trim(), type: 'unknown' };
      }

      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as JsonRecord;
      const name =
        ensureText(record.name) ||
        ensureText(record.label) ||
        ensureText(record.value);

      if (!name) {
        return null;
      }

      return {
        name,
        type: ensureText(record.type, 'unknown'),
        relevance: ensureText(record.relevance) || ensureText(record.description),
      };
    })
    .filter((item): item is InvestigationEntity => item !== null);
}

function toLeadArray(value: unknown): InvestigationLead[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): InvestigationLead | null => {
      if (typeof item === 'string') {
        return { title: item.trim(), detail: '', priority: 'medium' };
      }

      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as JsonRecord;
      const title =
        ensureText(record.title) ||
        ensureText(record.lead) ||
        ensureText(record.name);

      if (!title) {
        return null;
      }

      const priorityValue = ensureText(record.priority, 'medium').toLowerCase();
      const priority =
        priorityValue === 'high' || priorityValue === 'medium' || priorityValue === 'low'
          ? priorityValue
          : 'medium';

      return {
        title,
        detail: ensureText(record.detail) || ensureText(record.description),
        priority,
      };
    })
    .filter((item): item is InvestigationLead => item !== null);
}

function toTimelineArray(value: unknown): InvestigationTimelineEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): InvestigationTimelineEvent | null => {
      if (typeof item === 'string') {
        return { date: '', detail: item.trim() };
      }

      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as JsonRecord;
      const detail =
        ensureText(record.detail) ||
        ensureText(record.event) ||
        ensureText(record.description);

      if (!detail) {
        return null;
      }

      return {
        date: ensureText(record.date) || ensureText(record.time),
        detail,
      };
    })
    .filter((item): item is InvestigationTimelineEvent => item !== null);
}

function normalizeMindmapNodes(value: unknown, prefix = 'node'): MindmapNode[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index): MindmapNode | null => {
      if (typeof item === 'string') {
        return {
          id: `${prefix}-${index + 1}`,
          label: item.trim(),
          children: [],
        };
      }

      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as JsonRecord;
      const id = ensureText(record.id, `${prefix}-${index + 1}`);
      const label =
        ensureText(record.label) ||
        ensureText(record.title) ||
        ensureText(record.name);

      if (!label) {
        return null;
      }

      return {
        id,
        label,
        children: normalizeMindmapNodes(record.children ?? record.nodes, id),
      };
    })
    .filter((item): item is MindmapNode => item !== null);
}

function buildSectionNode(id: string, label: string, items: string[]): MindmapNode | null {
  if (items.length === 0) {
    return null;
  }

  return {
    id,
    label,
    children: items.slice(0, 6).map((item, index) => ({
      id: `${id}-${index + 1}`,
      label: item,
      children: [],
    })),
  };
}

function extractFallbackLines(answer: string): string[] {
  const lines = answer
    .split(/\n|(?<=[.!?])\s+/)
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter((line) => line.length > 20);

  return Array.from(new Set(lines)).slice(0, 5);
}

function buildFallbackMindmap(
  question: string,
  answer: string,
  entities: InvestigationEntity[],
  leads: InvestigationLead[],
  risks: string[],
  nextQuestions: string[],
  timeline: InvestigationTimelineEvent[],
): MindmapResult['mindmap'] {
  const sectionNodes = [
    buildSectionNode(
      'leads',
      'Priority Leads',
      leads.map((lead) => `${lead.priority.toUpperCase()}: ${lead.title}${lead.detail ? ` — ${lead.detail}` : ''}`),
    ),
    buildSectionNode(
      'entities',
      'Key Entities',
      entities.map((entity) => `${entity.name}${entity.type ? ` (${entity.type})` : ''}`),
    ),
    buildSectionNode('risks', 'Risks', risks),
    buildSectionNode('questions', 'Next Questions', nextQuestions),
    buildSectionNode(
      'timeline',
      'Timeline',
      timeline.map((event) => `${event.date ? `${event.date}: ` : ''}${event.detail}`),
    ),
  ].filter((node): node is MindmapNode => node !== null);

  if (sectionNodes.length > 0) {
    return {
      root: question,
      nodes: sectionNodes,
    };
  }

  const fallbackLines = extractFallbackLines(answer);

  return {
    root: question,
    nodes:
      fallbackLines.length > 0
        ? fallbackLines.map((line, index) => ({
            id: `summary-${index + 1}`,
            label: line,
            children: [],
          }))
        : [
            {
              id: 'summary-1',
              label: 'Review the AI answer and uploaded material.',
              children: [],
            },
          ],
  };
}

function normalizeInvestigationAnalysis(question: string, raw: string): MindmapResult {
  const parsed = parseStructuredJson<JsonRecord>(raw);

  const entities = toEntityArray(parsed?.entities);
  const leads = toLeadArray(parsed?.leads);
  const risks = toStringArray(parsed?.risks);
  const nextQuestions = firstNonEmptyStringArray(
    parsed?.next_questions,
    parsed?.nextQuestions,
    parsed?.questions,
  );
  const timeline = toTimelineArray(parsed?.timeline);
  const answer =
    ensureText(parsed?.answer) ||
    ensureText(parsed?.summary) ||
    ensureText(parsed?.executive_summary) ||
    raw.trim() ||
    'No answer returned.';
  const executiveSummary =
    ensureText(parsed?.executive_summary) ||
    ensureText(parsed?.executiveSummary) ||
    ensureText(parsed?.summary) ||
    answer.split('\n')[0].slice(0, 260);
  const confidence =
    clampConfidence(parsed?.confidence) ??
    clampConfidence(parsed?.confidence_score) ??
    0.5;

  const root =
    ensureText(parsed?.mindmap && typeof parsed.mindmap === 'object' ? (parsed.mindmap as JsonRecord).root : '') ||
    question;
  const nodes = normalizeMindmapNodes(
    parsed?.mindmap && typeof parsed.mindmap === 'object'
      ? (parsed.mindmap as JsonRecord).nodes
      : undefined,
    'mindmap',
  );

  return {
    answer,
    executiveSummary,
    confidence,
    entities,
    leads,
    risks,
    nextQuestions,
    timeline,
    mindmap: nodes.length > 0
      ? { root, nodes }
      : buildFallbackMindmap(question, answer, entities, leads, risks, nextQuestions, timeline),
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function buildFilesSummary(files: AnalysisFile[]): string {
  let remaining = MAX_TOTAL_PROMPT_CHARS;

  return files
    .map((file) => {
      if (remaining <= 0) {
        return null;
      }

      const header = `FILE: ${file.name}\nTYPE: ${file.type}\n`;
      const preview = toPreviewText(file.data, Math.min(MAX_CHARS_PER_FILE, remaining));
      const body = `${header}CONTENT:\n${preview}`;
      remaining -= body.length;
      return body;
    })
    .filter((item): item is string => item !== null)
    .join('\n\n---\n\n');
}

async function requestOllama(messages: OllamaMessage[], baseUrl?: string, model?: string): Promise<string> {
  const response = await fetch(`${resolveBaseUrl(baseUrl)}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: resolveModel(model),
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error ${response.status} — is Ollama running on ${resolveBaseUrl(baseUrl)}?`);
  }

  const data = (await response.json()) as {
    message?: { content?: string };
    response?: string;
  };

  return data.message?.content || data.response || 'No response';
}

function isTextLikeFile(file: File, ext: string): boolean {
  return (
    file.type.startsWith('text/') ||
    TEXT_FILE_EXTENSIONS.has(ext) ||
    TEXT_FILE_MIME_TYPES.has(file.type)
  );
}

export async function sendAiMessage(
  history: AiMessage[],
  newMessage: string,
  baseUrl?: string,
  model?: string,
): Promise<string> {
  const messages = history.map((message) => ({
    role: message.role,
    content: message.content,
  })) as Array<{ role: 'user' | 'assistant'; content: string }>;

  messages.push({ role: 'user', content: newMessage });

  return requestOllama(
    [
      {
        role: 'system',
        content: 'You are an OSINT investigation assistant. Be concrete, careful, and concise.',
      },
      ...messages,
    ],
    baseUrl,
    model,
  );
}

export async function readFileForAnalysis(file: File): Promise<UploadedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const id = crypto.randomUUID();

  if (ext === 'json') {
    return new Promise<UploadedFile>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          resolve({
            id,
            name: file.name,
            type: 'json',
            data: parsed,
            size: file.size,
            uploadedAt: new Date().toISOString(),
          });
        } catch {
          reject(new Error(`${file.name} is not valid JSON`));
        }
      };
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsText(file);
    });
  }

  if (file.type.startsWith('image/')) {
    return {
      id,
      name: file.name,
      type: 'image',
      data: `[Image file: ${file.name} | size: ${formatBytes(file.size)}]`,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };
  }

  if (ext === 'pdf' || file.type === 'application/pdf') {
    return {
      id,
      name: file.name,
      type: 'pdf',
      data: `[PDF document: ${file.name} | size: ${formatBytes(file.size)}]`,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };
  }

  if (!isTextLikeFile(file, ext)) {
    return {
      id,
      name: file.name,
      type: ext || file.type.split('/')[1] || 'file',
      data: `[Binary file omitted from prompt: ${file.name} | type: ${file.type || 'unknown'} | size: ${formatBytes(file.size)}]`,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };
  }

  return new Promise<UploadedFile>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        id,
        name: file.name,
        type: ext || file.type.split('/')[1] || 'file',
        data: reader.result as string,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsText(file);
  });
}

export async function analyzeFilesWithAi(
  question: string,
  files: AnalysisFile[],
  baseUrl?: string,
  model?: string,
): Promise<MindmapResult> {
  const filesSummary = buildFilesSummary(files);

  const systemPrompt = `You are a disciplined OSINT investigation analyst.
Only use the uploaded material. Do not invent evidence.
Return ONLY valid JSON with this exact shape:
{
  "answer": "Detailed answer grounded in the uploaded files",
  "executive_summary": "Short high-value summary",
  "confidence": 0.0,
  "entities": [
    { "name": "Entity name", "type": "person|org|domain|ip|email|file|event|unknown", "relevance": "Why it matters" }
  ],
  "leads": [
    { "title": "Lead title", "detail": "Why it matters / what to check", "priority": "high|medium|low" }
  ],
  "risks": ["Important risk or red flag"],
  "next_questions": ["Question to investigate next"],
  "timeline": [
    { "date": "ISO date or rough date", "detail": "What happened" }
  ],
  "mindmap": {
    "root": "Central topic",
    "nodes": [
      {
        "id": "1",
        "label": "Main finding",
        "children": [
          { "id": "1-1", "label": "Supporting detail", "children": [] }
        ]
      }
    ]
  }
}`;

  const userMessage = `FILES UPLOADED:\n${filesSummary}\n\nINVESTIGATION QUESTION:\n${question}\n\nFocus on evidence, leads, risks, and unanswered questions.`;

  const raw = await requestOllama(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    baseUrl,
    model,
  );

  return normalizeInvestigationAnalysis(question, raw);
}

export async function generatePredictions(
  question: string,
  answer: string,
  baseUrl?: string,
  model?: string,
): Promise<PredictionData> {
  const raw = await requestOllama(
    [
      {
        role: 'system',
        content:
          'You model investigation outcomes. Return only valid JSON with keys action, predictions, confidence, and risks.',
      },
      {
        role: 'user',
        content: `Question: ${question}\n\nAnswer:\n${answer}\n\nGenerate 3 concise predictions and key risks.`,
      },
    ],
    baseUrl,
    model,
  );

  const parsed = parseStructuredJson<JsonRecord>(raw);
  if (!parsed) {
    return {
      action: 'Review predictions manually',
      predictions: [raw.slice(0, 220)],
      confidence: 0,
      risks: [],
    };
  }

  return {
    action:
      ensureText(parsed.action) ||
      ensureText(parsed.recommendation) ||
      'Review the findings before acting.',
    predictions: toStringArray(parsed.predictions).slice(0, 5),
    confidence: clampConfidence(parsed.confidence) ?? 0,
    risks: toStringArray(parsed.risks).slice(0, 5),
  };
}

export interface AnalysisFile {
  name: string;
  type: string;
  data: unknown;
}
