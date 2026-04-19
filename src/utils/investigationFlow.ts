import type { ImportedFile, MiplerNode } from '../types';

export const DEFAULT_INVESTIGATION_PROFILE_NAMES = [
  'NEXUS - Commander & Orchestrator',
  'SOVEREIGN - Council Leader & Master Strategist',
  'OREL - OSINT Researcher',
  'TRACE - Digital Forensics Investigator',
  'BISHOP - Attribution Analyst',
  'FLUX - Log & Timeline Expert',
  'VEIL - Dark Web Researcher',
  'PRISM - Traffic & Protocol Analyst',
  'MNEMONIC - Eidetic Memory & Knowledge Synthesizer',
  'RIDDLE - Logic Deductionist',
  'SPHINX - Riddle & Puzzle Master',
  'RAGNAR - War Game Strategist',
  'STERLING - Field Spy & Infiltrator',
  'ORACLE-V - Pattern Predictor',
];

export const PREVIEW_PROFILE_NAMES = [
  'NEXUS - Commander & Orchestrator',
  'MNEMONIC - Eidetic Memory & Knowledge Synthesizer',
  'RIDDLE - Logic Deductionist',
  'SPHINX - Riddle & Puzzle Master',
  'ORACLE-V - Pattern Predictor',
];

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
}

export function tryParseJsonText(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function normalizeImportedFile(file: ImportedFile): Record<string, unknown> {
  const normalizedData =
    typeof file.data === 'string'
      ? (tryParseJsonText(file.data) ?? file.data.slice(0, 5000))
      : file.data;
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    data: normalizedData,
  };
}

function getTopLevelKeys(payload: unknown): string[] {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return Object.keys(payload as Record<string, unknown>).slice(0, 12);
  }

  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      return Object.keys(first as Record<string, unknown>).slice(0, 12);
    }
  }

  return [];
}

export interface InvestigationIntake {
  rawData: unknown;
  question: string;
  signature: string;
  summary: string;
  topLevelKeys: string[];
}

export function buildInvestigationIntake(nodes: MiplerNode[]): InvestigationIntake {
  const importNodes = nodes.filter((node) => node.data.cardType === 'import-card');
  const questionNode = nodes.find((node) => node.data.cardType === 'question-card');

  const imports = importNodes.map((node) => {
    const parsedContent = tryParseJsonText(node.data.content || '');
    return {
      title: node.data.title || node.id,
      pasted_json: parsedContent,
      pasted_text: parsedContent ? '' : (node.data.content || '').trim(),
      imported_files: (node.data.importedFiles || []).map(normalizeImportedFile),
    };
  });

  const rawData =
    imports.length === 1 &&
    imports[0].pasted_json &&
    imports[0].imported_files.length === 0 &&
    !imports[0].pasted_text
      ? imports[0].pasted_json
      : { imports };

  const question = (questionNode?.data.questionText || questionNode?.data.content || '').trim();
  const topLevelKeys = getTopLevelKeys(rawData);
  const signature = stableStringify({ rawData, question });

  const summaryParts = [
    `${importNodes.length} intake card${importNodes.length === 1 ? '' : 's'}`,
    question ? 'question provided' : 'no question yet',
    topLevelKeys.length > 0 ? `keys: ${topLevelKeys.join(', ')}` : '',
  ].filter(Boolean);

  return {
    rawData,
    question,
    signature,
    summary: summaryParts.join(' | '),
    topLevelKeys,
  };
}
