import type { Node, Edge } from 'reactflow';

export type CardType =
  | 'note'
  | 'image'
  | 'pdf'
  | 'whois'
  | 'dns'
  | 'reverse-image'
  | 'osint-framework'
  | 'custom-url'
  | 'title-card'
  // AI workspace cards
  | 'agent'
  | 'agent-output'
  | 'ai-generated'
  | 'prediction'
  | 'import-card'
  | 'investigation-preview'
  | 'report-agent'
  | 'agent-answer'
  | 'question-card'
  | 'data-supplier'
  | 'agent-group'
  | 'card-maker'
  // Workflow engine node types
  | 'http-request'
  | 'code-exec'
  | 'transform'
  | 'condition'
  | 'loop'
  | 'merge'
  | 'swarm-agent'
  | 'osint-whois'
  | 'osint-dns'
  | 'osint-subdomain'
  | 'osint-ip'
  | 'osint-email'
  | 'osint-portscan'
  | 'delay'
  | 'webhook'
  | 'trigger';

export type LineStyle = 'dashed' | 'solid' | 'dotted';

export type AgentStatus = 'idle' | 'running' | 'done' | 'error' | 'thinking';

export interface AgentConfig {
  name: string;
  role?: string;
  personality: string;
  behavior?: string;
  profileName?: string;
  internetAccess: boolean;
  model: string;
  systemPrompt: string;
  status: AgentStatus;
  lastOutput: string;
  autoGenerate: boolean;
  connectedAgents: string[];
  webSearchEnabled?: boolean;
}

export interface ImportedFile {
  id: string;
  name: string;
  type: string;
  data: unknown;
  size: number;
}

export interface CardData {
  cardType: CardType;
  title: string;
  content: string;
  url?: string;
  imageData?: string;
  pdfData?: string;
  fileName?: string;
  width?: number;
  height?: number;
  cardColor?: string;
  createdAt: string;
  updatedAt: string;
  agentConfig?: AgentConfig;
  isAiGenerated?: boolean;
  predictionData?: PredictionData;
  questionText?: string;
  importedFiles?: ImportedFile[];
  previewData?: InvestigationPreviewData;
  reportData?: ReportData;
  answerText?: string;
  answerStatus?: 'positive' | 'negative' | 'neutral' | 'pending';
  // Data supplier fields
  supplierData?: unknown;
  // Agent group fields
  agentGroupAgents?: string[];
  agentGroupStrategy?: 'pipeline' | 'parallel' | 'debate';
  // Card maker fields
  cardMakerTemplate?: string;
  cardMakerCount?: number;
  // Workflow engine fields
  workflowConfig?: WorkflowNodeConfig;
  executionStatus?: 'idle' | 'running' | 'success' | 'error' | 'skipped';
  executionOutput?: string;
  executionTime?: number;
}

export interface WorkflowNodeConfig {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  code?: string;
  transform?: string;
  field?: string;
  template?: string;
  condition?: string;
  delimiter?: string;
  mode?: string;
  maxIterations?: number;
  seconds?: number;
  target?: string;
  osintTool?: string;
  swarmAgents?: SwarmAgentConfig[];
  swarmStrategy?: string;
  swarmTask?: string;
  triggerType?: string;
  allowWebSearch?: boolean;
  previewApprovedSignature?: string;
}

export interface SwarmAgentConfig {
  name: string;
  role: string;
  personality: string;
  model: string;
}

export interface InvestigationPreviewData {
  caseLabel: string;
  objective: string;
  structureOverview: string;
  topLevelKeys: string[];
  entities: Array<{
    name: string;
    type: string;
    reason: string;
  }>;
  relationships: string[];
  timeline: string[];
  hypotheses: string[];
  assumptions: string[];
  gaps: string[];
  recommendedAgents: string[];
  simulationFocus?: string;
  continuePrompt: string;
  readyToContinue: boolean;
  sourceSignature: string;
}

export interface ReportData {
  summary: string;
  findings: string[];
  sources: string[];
  confidence: number;
  generatedAt: string;
  threatLevel?: string;
  questionAnswer?: string;
  simulation?: {
    scenario: string;
    forecast: string;
    assumptions: string[];
    confidence: number;
  };
  priorityActions?: string[];
  intelligenceGaps?: string[];
  options?: Array<{
    title: string;
    decision: string;
    evidence: string;
    confidence: number;
    risk: 'low' | 'medium' | 'high';
    verificationStep: string;
  }>;
}

export interface PredictionData {
  action: string;
  predictions: string[];
  confidence: number;
  risks: string[];
}

export interface EdgeData {
  color: string;
  lineStyle: LineStyle;
  strokeWidth: number;
  isGlowing?: boolean;
  dataFlowActive?: boolean;
  lastPayload?: unknown;
  payloadType?: string;
  payloadSize?: number;
}

export type MiplerNode = Node<CardData>;
export type MiplerEdge = Edge<EdgeData>;

export interface Investigation {
  id: string;
  name: string;
  nodes: MiplerNode[];
  edges: MiplerEdge[];
  viewport: { x: number; y: number; zoom: number };
  isAiAnalysis?: boolean;
}

export interface WorkspaceState {
  id: string;
  name: string;
  investigations: Investigation[];
  activeInvestigationId: string;
  llmBaseUrl?: string;
  llmModel?: string;
  aiChatHistory?: AiMessage[];
  showDots: boolean;
  version?: number;
  createdAt: string;
  updatedAt: string;
  // Legacy compat
  nodes?: MiplerNode[];
  edges?: MiplerEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  data: unknown;
  size: number;
  uploadedAt: string;
}

export interface MindmapNode {
  id: string;
  label: string;
  children: MindmapNode[];
}

export interface InvestigationEntity {
  name: string;
  type: string;
  relevance?: string;
}

export interface InvestigationLead {
  title: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
}

export interface InvestigationTimelineEvent {
  date: string;
  detail: string;
}

export interface MindmapResult {
  answer: string;
  executiveSummary?: string;
  confidence?: number;
  entities?: InvestigationEntity[];
  leads?: InvestigationLead[];
  risks?: string[];
  nextQuestions?: string[];
  timeline?: InvestigationTimelineEvent[];
  mindmap: {
    root: string;
    nodes: MindmapNode[];
  };
}

export interface DataImportConfig {
  files: UploadedFile[];
  question: string;
  analysisResult?: MindmapResult;
  predictions?: PredictionData;
}
