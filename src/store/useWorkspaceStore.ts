import { create } from 'zustand';
import {
  type Connection,
  type EdgeChange,
  type NodeChange,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import type {
  MiplerNode,
  MiplerEdge,
  CardType,
  CardData,
  EdgeData,
  LineStyle,
  WorkspaceState,
  Investigation,
  AiMessage,
  ImportedFile,
  UploadedFile,
  PredictionData,
} from '../types';

interface HistoryEntry {
  nodes: MiplerNode[];
  edges: MiplerEdge[];
}

interface WorkspaceStore {
  investigations: Investigation[];
  activeInvestigationId: string;

  nodes: MiplerNode[];
  edges: MiplerEdge[];
  viewport: { x: number; y: number; zoom: number };
  lastPointerPosition: { x: number; y: number } | null;

  history: HistoryEntry[];
  historyIndex: number;

  // UI
  showDots: boolean;
  exportModalOpen: boolean;
  importModalOpen: boolean;
  customUrlModalOpen: boolean;
  edgeStyleModalOpen: boolean;
  selectedEdgeId: string | null;
  aiPanelOpen: boolean;
  apiSettingsOpen: boolean;
  investigationMenuOpen: boolean;
  agentSidebarOpen: boolean;
  agentWorkspaceMode: boolean;

  // Combine workspace modal
  combineModalOpen: boolean;
  selectedForCombine: string[];

  // Import data
  importDataModalOpen: boolean;
  importedFiles: UploadedFile[];
  importQuestion: string;

  defaultEdgeColor: string;
  defaultLineStyle: LineStyle;
  defaultStrokeWidth: number;

  // Ollama config
  llmBaseUrl: string;
  llmModel: string;
  aiChatHistory: AiMessage[];

  // Data flow animation state
  activeDataFlows: string[];

  // Execution state
  isExecuting: boolean;
  executionId: string | null;

  lastModified: number;
  lastSavedAt: number | null;

  setNodes: (nodes: MiplerNode[]) => void;
  setEdges: (edges: MiplerEdge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setViewport: (vp: { x: number; y: number; zoom: number }) => void;
  setLastPointerPosition: (p: { x: number; y: number } | null) => void;

  addCard: (type: CardType, position?: { x: number; y: number }, extra?: Partial<CardData>) => string;
  updateCard: (id: string, data: Partial<CardData>) => void;
  removeCard: (id: string) => void;
  setCardColor: (id: string, color: string) => void;

  updateEdgeStyle: (id: string, data: Partial<EdgeData>) => void;
  setDefaultEdgeColor: (c: string) => void;
  setDefaultLineStyle: (s: LineStyle) => void;
  setDefaultStrokeWidth: (w: number) => void;

  pushHistory: () => void;
  undo: () => void;

  setExportModalOpen: (o: boolean) => void;
  setImportModalOpen: (o: boolean) => void;
  setCustomUrlModalOpen: (o: boolean) => void;
  setEdgeStyleModalOpen: (o: boolean, edgeId?: string | null) => void;
  setAiPanelOpen: (o: boolean) => void;
  setApiSettingsOpen: (o: boolean) => void;
  setInvestigationMenuOpen: (o: boolean) => void;
  setAgentSidebarOpen: (o: boolean) => void;
  setAgentWorkspaceMode: (o: boolean) => void;
  setShowDots: (o: boolean) => void;

  setLlmBaseUrl: (u: string) => void;
  setLlmModel: (m: string) => void;
  addAiMessage: (msg: AiMessage) => void;
  clearAiChat: () => void;

  addInvestigation: () => string;
  removeInvestigation: (id: string) => void;
  switchInvestigation: (id: string) => void;
  renameInvestigation: (id: string, name: string) => void;

  // Combine workspace
  setCombineModalOpen: (o: boolean) => void;
  toggleCombineSelection: (id: string) => void;
  combineSelectedInvestigations: () => void;

  // Import data
  setImportDataModalOpen: (o: boolean) => void;
  setImportedFiles: (files: UploadedFile[]) => void;
  setImportQuestion: (q: string) => void;

  // Data flow
  setActiveDataFlows: (edgeIds: string[]) => void;
  startDataFlow: (edgeIds: string[]) => void;
  stopDataFlow: () => void;

  // Execution
  setIsExecuting: (v: boolean) => void;
  setExecutionId: (id: string | null) => void;

  getActiveInvestigation: () => Investigation;
  syncActiveInvestigation: () => void;

  getWorkspaceState: () => WorkspaceState;
  loadWorkspaceState: (state: WorkspaceState) => void;
  clearWorkspace: () => void;
  importSelectedNodesToAiWorkspace: () => boolean;
  saveToLocalFile: () => void;
  loadFromLocalFile: () => Promise<boolean>;
}

function getDefaultTitle(type: CardType): string {
  const t: Record<CardType, string> = {
    note: 'Note', image: 'Image', pdf: 'Document', whois: 'WHOIS Lookup',
    dns: 'DNS Lookup', 'reverse-image': 'Reverse Image Search',
    'osint-framework': 'OSINT Framework', 'custom-url': 'Web Tool',
    'title-card': 'Investigation Title',
    agent: 'Agent', 'agent-output': 'Output',
    'ai-generated': 'AI Card', prediction: 'Prediction',
    'import-card': 'Import Card', 'investigation-preview': 'Investigation Preview', 'report-agent': 'Report Agent', 'agent-answer': 'Agent Answer',
    'question-card': 'Question', 'data-supplier': 'Data Supplier',
    'agent-group': 'Agent Group', 'card-maker': 'Card Maker',
    'http-request': 'HTTP Request', 'code-exec': 'Code Execution',
    'transform': 'Transform', 'condition': 'Condition', 'loop': 'Loop',
    'merge': 'Merge', 'swarm-agent': 'Swarm',
    'osint-whois': 'WHOIS', 'osint-dns': 'DNS Lookup', 'osint-subdomain': 'Subdomain Enum',
    'osint-ip': 'IP Lookup', 'osint-email': 'Email Lookup', 'osint-portscan': 'Port Scan',
    'delay': 'Delay', 'webhook': 'Webhook', 'trigger': 'Trigger',
  };
  return t[type] || 'Card';
}

function getDefaultWidth(type: CardType): number {
  const w: Record<CardType, number> = {
    note: 300, image: 320, pdf: 360, whois: 360, dns: 360,
    'reverse-image': 440, 'osint-framework': 440, 'custom-url': 440,
    'title-card': 400,
    agent: 340, 'agent-output': 380,
    'ai-generated': 320, prediction: 360,
    'import-card': 340, 'investigation-preview': 420, 'report-agent': 400, 'agent-answer': 360,
    'question-card': 380, 'data-supplier': 340, 'agent-group': 400, 'card-maker': 340,
    'http-request': 380, 'code-exec': 400, 'transform': 340,
    'condition': 340, 'loop': 320, 'merge': 300, 'swarm-agent': 420,
    'osint-whois': 360, 'osint-dns': 360, 'osint-subdomain': 360,
    'osint-ip': 360, 'osint-email': 360, 'osint-portscan': 360,
    'delay': 260, 'webhook': 280, 'trigger': 280,
  };
  return w[type] || 300;
}

const makeCardData = (type: CardType, extra?: Partial<CardData>): CardData => {
  const now = new Date().toISOString();
  const defaultColors: Record<string, string> = {
    'title-card': '#1e1e2a',
    'ai-generated': '#1a2a3a',
    'prediction': '#2a1a3a',
    'import-card': '#1a2a1a',
    'investigation-preview': '#10202a',
    'report-agent': '#2a1a1a',
    'agent-answer': '#1a1a2a',
    'question-card': '#2a2a1a',
    'data-supplier': '#1a2a2a',
    'agent-group': '#1a1a3a',
    'card-maker': '#2a1a2a',
    'http-request': '#1a2a3a',
    'code-exec': '#2a2a1a',
    'transform': '#1a2a2a',
    'condition': '#2a1a2a',
    'loop': '#1a1a2a',
    'merge': '#2a2a2a',
    'swarm-agent': '#1a1a3a',
    'osint-whois': '#1a2a2a',
    'osint-dns': '#1a2a2a',
    'osint-subdomain': '#1a2a2a',
    'osint-ip': '#1a2a2a',
    'osint-email': '#1a2a2a',
    'osint-portscan': '#2a1a1a',
    'delay': '#1e1e1e',
    'webhook': '#1e2a1e',
    'trigger': '#2a2a1e',
  };
  return {
    cardType: type,
    title: getDefaultTitle(type),
    content: '',
    width: getDefaultWidth(type),
    cardColor: defaultColors[type] || '#1e1e1e',
    createdAt: now,
    updatedAt: now,
    executionStatus: 'idle',
    workflowConfig: {},
    ...extra,
  };
};

function createInvestigation(name?: string, isAiAnalysis?: boolean): Investigation {
  return {
    id: uuidv4(),
    name: name || 'Untitled Investigation',
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    isAiAnalysis: isAiAnalysis || false,
  };
}

function summarizeEvidenceNode(node: MiplerNode): string {
  const parts: string[] = [];

  if (node.data.content) parts.push(node.data.content);
  if (node.data.answerText) parts.push(node.data.answerText);
  if (node.data.executionOutput) parts.push(node.data.executionOutput);
  if (node.data.reportData?.summary) parts.push(node.data.reportData.summary);
  if (node.data.agentConfig?.lastOutput) parts.push(node.data.agentConfig.lastOutput);
  if (node.data.url) parts.push(`URL: ${node.data.url}`);
  if (node.data.questionText) parts.push(`Question: ${node.data.questionText}`);

  return parts.join('\n\n').slice(0, 10000);
}

function buildEvidenceFilesFromNode(node: MiplerNode, investigationName: string): ImportedFile[] {
  const importedFiles = (node.data.importedFiles || []).map((file) => ({
    ...file,
    id: uuidv4(),
  }));

  const evidencePacket = {
    sourceInvestigation: investigationName,
    cardId: node.id,
    cardType: node.data.cardType,
    title: node.data.title || node.id,
    question: node.data.questionText || '',
    url: node.data.url || '',
    answer: node.data.answerText || '',
    reportSummary: node.data.reportData?.summary || '',
    executionOutput: node.data.executionOutput || '',
    content: summarizeEvidenceNode(node),
  };

  const serialized = JSON.stringify(evidencePacket, null, 2);
  importedFiles.push({
    id: uuidv4(),
    name: `${(node.data.title || node.id).replace(/[^a-z0-9-_]+/gi, '_') || 'evidence'}.json`,
    type: 'json',
    data: evidencePacket,
    size: serialized.length,
  });

  return importedFiles;
}

const dashMap: Record<LineStyle, string> = { dashed: '8 4', dotted: '2 4', solid: '0' };

// ── Default AI workspace chain ──────────────────────────────────────────────
function buildDefaultAiChain(inv: Investigation): void {
  const startX = 100;
  const y = 150;
  const gapX = 380;

  const makeNode = (type: CardType, title: string, x: number, cardColor: string, extra?: Partial<CardData>): MiplerNode => {
    const id = `card-${uuidv4()}`;
    const now = new Date().toISOString();
    return {
      id,
      type: 'miplerCard',
      position: { x, y },
      data: {
        cardType: type,
        title,
        content: '',
        width: getDefaultWidth(type),
        cardColor,
        createdAt: now,
        updatedAt: now,
        executionStatus: 'idle',
        workflowConfig: {},
        ...extra,
      },
    };
  };

  const impNode = makeNode('import-card', 'Data Card', startX, '#1a2a1a', {
    content: 'Paste the raw JSON or attach evidence files here.',
  });
  const prvNode = makeNode('investigation-preview', 'Investigation Preview', startX + gapX, '#10202a', {
    content: 'Paste raw JSON in the intake card, review the preview, then continue to launch the swarm.',
  });
  const supNode = makeNode('data-supplier', 'Data Supplier', startX + gapX, '#1a2a2a', {
    content: 'Structured evidence handoff for the investigation swarm.',
  });
  const grpNode = makeNode('agent-group', 'Investigation Swarm', startX + gapX * 2, '#1a1a3a', {
    agentGroupStrategy: 'parallel',
    agentGroupAgents: [],
    content: 'Coordinate all available investigation specialists by default, infer the next move, and simulate likely outcomes.',
  });
  const rptNode = makeNode('report-agent', 'Final Report', startX + gapX * 3, '#2a1a1a');
  const qNode = makeNode('question-card', 'Question Card', startX + gapX * 4, '#2a2a1a', {
    questionText: 'What happens after the next move, and what should the team expect?',
    content: 'What happens after the next move, and what should the team expect?',
  });
  const ansNode = makeNode('agent-answer', 'Short Answer', startX + gapX * 5, '#1a1a2a');

  prvNode.position = { x: startX + gapX, y: y - 210 };

  const makeEdge = (source: string, target: string): MiplerEdge => ({
    id: `edge-${uuidv4()}`,
    source,
    target,
    sourceHandle: 'bottom-source',
    targetHandle: 'top-target',
    type: 'rope',
    animated: false,
    data: {
      color: '#888888',
      lineStyle: 'dashed',
      strokeWidth: 2,
      isGlowing: false,
      dataFlowActive: false,
    },
    style: { stroke: '#888888', strokeWidth: 2, strokeDasharray: '8 4' },
  });

  inv.nodes = [impNode, prvNode, supNode, grpNode, rptNode, qNode, ansNode];
  inv.edges = [
    makeEdge(impNode.id, prvNode.id),
    makeEdge(impNode.id, supNode.id),
    makeEdge(supNode.id, grpNode.id),
    makeEdge(grpNode.id, rptNode.id),
    makeEdge(rptNode.id, qNode.id),
    makeEdge(qNode.id, ansNode.id),
  ];
}

// Create normal workspace (default first) + AI workspace
const normalInv = createInvestigation('My Investigation');
const aiInv = createInvestigation('AI Investigation', true);
buildDefaultAiChain(aiInv);

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  investigations: [normalInv, aiInv],
  activeInvestigationId: normalInv.id, // NORMAL workspace is default
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  lastPointerPosition: null,

  history: [],
  historyIndex: -1,

  showDots: true,
  exportModalOpen: false,
  importModalOpen: false,
  customUrlModalOpen: false,
  edgeStyleModalOpen: false,
  selectedEdgeId: null,
  aiPanelOpen: false,
  apiSettingsOpen: false,
  investigationMenuOpen: false,
  agentSidebarOpen: false,
  agentWorkspaceMode: false,

  combineModalOpen: false,
  selectedForCombine: [],

  importDataModalOpen: false,
  importedFiles: [],
  importQuestion: '',

  defaultEdgeColor: '#888888',
  defaultLineStyle: 'dashed',
  defaultStrokeWidth: 2,

  llmBaseUrl: 'http://localhost:11434',
  llmModel: 'qwen2.5:0.5b',
  aiChatHistory: [],

  activeDataFlows: [],

  isExecuting: false,
  executionId: null,

  lastModified: Date.now(),
  lastSavedAt: null,

  syncActiveInvestigation: () => {
    const s = get();
    set({
      investigations: s.investigations.map((inv) =>
        inv.id === s.activeInvestigationId
          ? { ...inv, nodes: s.nodes, edges: s.edges, viewport: s.viewport }
          : inv
      ),
    });
  },

  getActiveInvestigation: () => {
    const s = get();
    return s.investigations.find((i) => i.id === s.activeInvestigationId) || s.investigations[0];
  },

  pushHistory: () => {
    const s = get();
    const entry: HistoryEntry = {
      nodes: JSON.parse(JSON.stringify(s.nodes)),
      edges: JSON.parse(JSON.stringify(s.edges)),
    };
    const newHistory = s.history.slice(0, s.historyIndex + 1);
    newHistory.push(entry);
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const s = get();
    if (s.historyIndex < 0) return;
    const entry = s.history[s.historyIndex];
    if (!entry) return;
    set({
      nodes: JSON.parse(JSON.stringify(entry.nodes)),
      edges: JSON.parse(JSON.stringify(entry.edges)),
      historyIndex: s.historyIndex - 1,
      lastModified: Date.now(),
    });
    get().syncActiveInvestigation();
  },

  setNodes: (nodes) => set({ nodes, lastModified: Date.now() }),
  setEdges: (edges) => set({ edges, lastModified: Date.now() }),

  onNodesChange: (changes) => {
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes), lastModified: Date.now() }));
    get().syncActiveInvestigation();
  },

  onEdgesChange: (changes) => {
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) as MiplerEdge[], lastModified: Date.now() }));
    get().syncActiveInvestigation();
  },

  onConnect: (connection) => {
    const s = get();
    s.pushHistory();
    const edgeData: EdgeData = {
      color: s.defaultEdgeColor,
      lineStyle: s.defaultLineStyle,
      strokeWidth: s.defaultStrokeWidth,
      isGlowing: false,
      dataFlowActive: false,
    };
    set((state) => ({
      edges: addEdge({
        ...connection, id: `edge-${uuidv4()}`, type: 'rope', animated: false, data: edgeData,
        style: { stroke: edgeData.color, strokeWidth: edgeData.strokeWidth, strokeDasharray: dashMap[edgeData.lineStyle] },
      }, state.edges) as MiplerEdge[],
      lastModified: Date.now(),
    }));
    get().syncActiveInvestigation();
  },

  setViewport: (viewport) => {
    set({ viewport });
    get().syncActiveInvestigation();
  },

  setLastPointerPosition: (p) => set({ lastPointerPosition: p }),

  addCard: (type, position, extra) => {
    const s = get();
    s.pushHistory();
    const id = `card-${uuidv4()}`;
    const flowCenterX = (-s.viewport.x + window.innerWidth / 2) / Math.max(s.viewport.zoom, 0.001);
    const flowCenterY = (-s.viewport.y + (window.innerHeight - 44) / 2) / Math.max(s.viewport.zoom, 0.001);
    const basePos = position || s.lastPointerPosition || { x: flowCenterX, y: flowCenterY };
    const pos = {
      x: basePos.x + (Math.random() * 24 - 12),
      y: basePos.y + (Math.random() * 24 - 12),
    };
    const node: MiplerNode = { id, type: 'miplerCard', position: pos, data: makeCardData(type, extra) };
    set((state) => ({ nodes: [...state.nodes, node], lastModified: Date.now() }));
    get().syncActiveInvestigation();
    return id;
  },

  updateCard: (id, data) => {
    set((s) => ({
      nodes: s.nodes.map((n) => n.id === id ? { ...n, data: { ...n.data, ...data, updatedAt: new Date().toISOString() } } : n),
      lastModified: Date.now(),
    }));
    get().syncActiveInvestigation();
  },

  removeCard: (id) => {
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      lastModified: Date.now(),
    }));
    get().syncActiveInvestigation();
  },

  setCardColor: (id, color) => {
    set((s) => ({
      nodes: s.nodes.map((n) => n.id === id ? { ...n, data: { ...n.data, cardColor: color } } : n),
      lastModified: Date.now(),
    }));
    get().syncActiveInvestigation();
  },

  updateEdgeStyle: (id, data) => {
    set((s) => ({
      edges: s.edges.map((e) => {
        if (e.id !== id) return e;
        const merged = { ...(e.data || { color: '#888', lineStyle: 'dashed' as LineStyle, strokeWidth: 2 }), ...data };
        return { ...e, data: merged, style: { stroke: merged.color, strokeWidth: merged.strokeWidth, strokeDasharray: dashMap[merged.lineStyle] } };
      }) as MiplerEdge[],
      lastModified: Date.now(),
    }));
    get().syncActiveInvestigation();
  },

  setDefaultEdgeColor: (c) => set({ defaultEdgeColor: c }),
  setDefaultLineStyle: (s) => set({ defaultLineStyle: s }),
  setDefaultStrokeWidth: (w) => set({ defaultStrokeWidth: w }),

  setExportModalOpen: (o) => set({ exportModalOpen: o }),
  setImportModalOpen: (o) => set({ importModalOpen: o }),
  setCustomUrlModalOpen: (o) => set({ customUrlModalOpen: o }),
  setEdgeStyleModalOpen: (o, edgeId) => set({ edgeStyleModalOpen: o, selectedEdgeId: edgeId || null }),
  setAiPanelOpen: (o) => set({ aiPanelOpen: o }),
  setApiSettingsOpen: (o) => set({ apiSettingsOpen: o }),
  setInvestigationMenuOpen: (o) => set({ investigationMenuOpen: o }),
  setAgentSidebarOpen: (o) => set({ agentSidebarOpen: o }),
  setAgentWorkspaceMode: (o) => set({ agentWorkspaceMode: o }),
  setShowDots: (o) => set({ showDots: o, lastModified: Date.now() }),

  setLlmBaseUrl: (u) => set({ llmBaseUrl: u, lastModified: Date.now() }),
  setLlmModel: (m) => set({ llmModel: m, lastModified: Date.now() }),
  addAiMessage: (msg) => set((s) => ({ aiChatHistory: [...s.aiChatHistory, msg], lastModified: Date.now() })),
  clearAiChat: () => set({ aiChatHistory: [], lastModified: Date.now() }),

  addInvestigation: () => {
    const s = get();
    s.syncActiveInvestigation();
    const inv = createInvestigation();
    set({
      investigations: [...s.investigations, inv],
      activeInvestigationId: inv.id,
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      history: [],
      historyIndex: -1,
      lastModified: Date.now(),
    });
    return inv.id;
  },

  removeInvestigation: (id) => {
    const s = get();
    if (s.investigations.length <= 1) return;
    const remaining = s.investigations.filter((i) => i.id !== id);
    const newActive = id === s.activeInvestigationId
      ? remaining[0]
      : s.investigations.find((i) => i.id === s.activeInvestigationId) || remaining[0];
    set({
      investigations: remaining,
      activeInvestigationId: newActive.id,
      nodes: newActive.nodes,
      edges: newActive.edges,
      viewport: newActive.viewport,
      history: [],
      historyIndex: -1,
      agentSidebarOpen: !!newActive.isAiAnalysis,
      lastModified: Date.now(),
    });
  },

  switchInvestigation: (id) => {
    const s = get();
    s.syncActiveInvestigation();
    const target = s.investigations.find((i) => i.id === id);
    if (!target) return;
    set({
      activeInvestigationId: id,
      nodes: target.nodes,
      edges: target.edges,
      viewport: target.viewport,
      history: [],
      historyIndex: -1,
      agentSidebarOpen: !!target.isAiAnalysis,
      lastModified: Date.now(),
    });
  },

  renameInvestigation: (id, name) => {
    set((s) => ({
      investigations: s.investigations.map((i) => i.id === id ? { ...i, name } : i),
      lastModified: Date.now(),
    }));
  },

  // ── Combine workspace modal ───────────────────────────────────────────────
  setCombineModalOpen: (o) => set({ combineModalOpen: o, selectedForCombine: o ? [] : [] }),

  toggleCombineSelection: (id) => {
    set((s) => {
      const selected = s.selectedForCombine.includes(id)
        ? s.selectedForCombine.filter(i => i !== id)
        : [...s.selectedForCombine, id];
      return { selectedForCombine: selected };
    });
  },

  combineSelectedInvestigations: () => {
    const s = get();
    const selectedIds = s.selectedForCombine;
    if (selectedIds.length < 2) return;
    s.syncActiveInvestigation();

    const selectedInvs = s.investigations.filter(i => selectedIds.includes(i.id));
    let allNodes: MiplerNode[] = [];
    let allEdges: MiplerEdge[] = [];
    let offsetX = 0;

    for (const inv of selectedInvs) {
      const shifted = inv.nodes.map(n => ({
        ...n,
        position: { x: n.position.x + offsetX, y: n.position.y },
      }));
      allNodes = allNodes.concat(shifted);
      allEdges = allEdges.concat(inv.edges);
      offsetX += 1200;
    }

    const combined: Investigation = {
      id: uuidv4(),
      name: 'Combined Workspace',
      nodes: allNodes,
      edges: allEdges,
      viewport: { x: 0, y: 0, zoom: 1 },
    };

    const remaining = s.investigations.filter(i => !selectedIds.includes(i.id));
    set({
      investigations: [...remaining, combined],
      activeInvestigationId: combined.id,
      nodes: combined.nodes,
      edges: combined.edges,
      viewport: combined.viewport,
      history: [],
      historyIndex: -1,
      lastModified: Date.now(),
      combineModalOpen: false,
      selectedForCombine: [],
    });
  },

  // ── Import data ───────────────────────────────────────────────────────────
  setImportDataModalOpen: (o) => set({ importDataModalOpen: o }),
  setImportedFiles: (files) => set({ importedFiles: files }),
  setImportQuestion: (q) => set({ importQuestion: q }),

  // ── Data flow animation ───────────────────────────────────────────────────
  setActiveDataFlows: (edgeIds) => set({ activeDataFlows: edgeIds }),

  startDataFlow: (edgeIds) => {
    set((s) => ({
      activeDataFlows: edgeIds,
      edges: s.edges.map(e => ({
        ...e,
        animated: edgeIds.includes(e.id),
        data: { ...e.data, isGlowing: edgeIds.includes(e.id), dataFlowActive: edgeIds.includes(e.id) } as EdgeData,
      })) as MiplerEdge[],
    }));
    get().syncActiveInvestigation();
  },

  stopDataFlow: () => {
    set((s) => ({
      activeDataFlows: [],
      edges: s.edges.map(e => ({
        ...e,
        animated: false,
        data: { ...e.data, isGlowing: false, dataFlowActive: false } as EdgeData,
      })) as MiplerEdge[],
    }));
    get().syncActiveInvestigation();
  },

  setIsExecuting: (v) => set({ isExecuting: v }),
  setExecutionId: (id) => set({ executionId: id }),

  getWorkspaceState: (): WorkspaceState => {
    const s = get();
    s.syncActiveInvestigation();
    return {
      version: 2,
      id: uuidv4(),
      name: 'Mipler Export',
      investigations: s.investigations,
      activeInvestigationId: s.activeInvestigationId,
      llmBaseUrl: s.llmBaseUrl,
      llmModel: s.llmModel,
      aiChatHistory: s.aiChatHistory,
      showDots: s.showDots,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  loadWorkspaceState: (ws) => {
    let investigations = ws.investigations;
    let activeId = ws.activeInvestigationId;

    if (!investigations || investigations.length === 0) {
      const inv = createInvestigation(ws.name || 'Imported');
      inv.nodes = ws.nodes || [];
      inv.edges = ws.edges || [];
      inv.viewport = ws.viewport || { x: 0, y: 0, zoom: 1 };
      investigations = [inv];
      activeId = inv.id;
    }

    for (const inv of investigations) {
      for (const edge of inv.edges) {
        if (edge.data) {
          edge.style = {
            stroke: edge.data.color || '#888',
            strokeWidth: edge.data.strokeWidth || 2,
            strokeDasharray: dashMap[edge.data.lineStyle || 'dashed'],
          };
        }
      }
    }

    const active = investigations.find((i) => i.id === activeId) || investigations[0];

    set({
      investigations,
      activeInvestigationId: active.id,
      nodes: active.nodes,
      edges: active.edges,
      viewport: active.viewport,
      llmBaseUrl: ws.llmBaseUrl || 'http://localhost:11434',
      llmModel: ws.llmModel || 'qwen2.5:0.5b',
      aiChatHistory: ws.aiChatHistory || [],
      showDots: ws.showDots !== undefined ? ws.showDots : true,
      agentSidebarOpen: !!active.isAiAnalysis,
      history: [],
      historyIndex: -1,
      lastModified: Date.now(),
      lastSavedAt: Date.now(),
    });
  },

  clearWorkspace: () => {
    const s = get();
    const active = s.getActiveInvestigation();
    const clearedInv: Investigation = {
      ...active,
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    if (active.isAiAnalysis) {
      buildDefaultAiChain(clearedInv);
    }
    set({
      investigations: s.investigations.map(i =>
        i.id === s.activeInvestigationId ? clearedInv : i
      ),
      nodes: clearedInv.nodes,
      edges: clearedInv.edges,
      viewport: { x: 0, y: 0, zoom: 1 },
      history: [],
      historyIndex: -1,
      agentSidebarOpen: !!active.isAiAnalysis,
      lastModified: Date.now(),
    });
  },

  importSelectedNodesToAiWorkspace: () => {
    const s = get();
    s.syncActiveInvestigation();
    const selectedNodes = s.nodes.filter((node) => node.selected);

    if (selectedNodes.length === 0) {
      return false;
    }

    const sourceInvestigation = s.getActiveInvestigation();

    let aiInvestigation = s.investigations.find((inv) => inv.isAiAnalysis);
    let createdAiInvestigation = false;

    if (!aiInvestigation) {
      aiInvestigation = createInvestigation('AI Investigation', true);
      buildDefaultAiChain(aiInvestigation);
      createdAiInvestigation = true;
    }

    let importCard = aiInvestigation.nodes.find((node) => node.data.cardType === 'import-card');
    const evidenceFiles = selectedNodes.flatMap((node) =>
      buildEvidenceFilesFromNode(node, sourceInvestigation.name),
    );
    const evidenceSummary = selectedNodes
      .map((node) => `[${node.data.cardType}] ${node.data.title || node.id}`)
      .join(', ');

    if (!importCard) {
      const now = new Date().toISOString();
      importCard = {
        id: `card-${uuidv4()}`,
        type: 'miplerCard',
        position: { x: 100, y: 150 },
        data: {
          cardType: 'import-card',
          title: 'Evidence Intake',
          content: '',
          width: getDefaultWidth('import-card'),
          cardColor: '#1a2a1a',
          createdAt: now,
          updatedAt: now,
          executionStatus: 'idle',
          workflowConfig: {},
        },
      };
      aiInvestigation.nodes.unshift(importCard);
    }

    if (importCard) {
      const existingFiles = importCard.data.importedFiles || [];
      importCard.data = {
        ...importCard.data,
        importedFiles: [...existingFiles, ...evidenceFiles],
        content: evidenceSummary,
        title: `Evidence Intake (${existingFiles.length + evidenceFiles.length})`,
        updatedAt: new Date().toISOString(),
      };
    }

    const investigations = createdAiInvestigation
      ? [...s.investigations, aiInvestigation]
      : s.investigations.map((inv) => (inv.id === aiInvestigation!.id ? aiInvestigation! : inv));

    set({
      investigations,
      activeInvestigationId: aiInvestigation.id,
      nodes: aiInvestigation.nodes,
      edges: aiInvestigation.edges,
      viewport: aiInvestigation.viewport,
      history: [],
      historyIndex: -1,
      agentSidebarOpen: true,
      lastModified: Date.now(),
    });

    return true;
  },

  saveToLocalFile: () => {
    const s = get();
    s.syncActiveInvestigation();
    const state = s.getWorkspaceState();
    try {
      localStorage.setItem('mipler-workspace', JSON.stringify(state));
      set({ lastSavedAt: Date.now() });
    } catch {}
  },

  loadFromLocalFile: async () => {
    try {
      const raw = localStorage.getItem('mipler-workspace');
      if (!raw) return false;
      const state = JSON.parse(raw) as WorkspaceState;
      get().loadWorkspaceState(state);
      return true;
    } catch {
      return false;
    }
  },
}));

// ── Mindmap → Canvas ──────────────────────────────────────────────────────────
import type { MindmapNode as MMNode, MindmapResult } from '../types';

const DASH_MAP_LOCAL: Record<string, string> = { dashed: '8 4', dotted: '2 4', solid: '0' };

function buildCardNode(
  id: string,
  position: { x: number; y: number },
  title: string,
  content: string,
  cardColor: string,
  isAiGenerated?: boolean,
  cardType: 'note' | 'ai-generated' = isAiGenerated ? 'ai-generated' : 'note',
): import('../types').MiplerNode {
  const now = new Date().toISOString();
  return {
    id,
    type: 'miplerCard',
    position,
    data: {
      cardType,
      title,
      content,
      width: 280,
      cardColor,
      createdAt: now,
      updatedAt: now,
      isAiGenerated: cardType === 'ai-generated' || isAiGenerated || false,
    },
  };
}

function buildEdge(
  source: string,
  target: string,
  color = '#3b82f6',
  glowing = false,
): import('../types').MiplerEdge {
  return {
    id: `edge-${uuidv4()}`,
    source,
    target,
    sourceHandle: 'bottom-source',
    targetHandle: 'top-target',
    type: 'rope',
    animated: glowing,
    data: {
      color,
      lineStyle: 'dashed' as import('../types').LineStyle,
      strokeWidth: 2,
      isGlowing: glowing,
      dataFlowActive: glowing,
    },
    style: {
      stroke: color,
      strokeWidth: 2,
      strokeDasharray: DASH_MAP_LOCAL['dashed'],
    },
  };
}

export function spawnMindmapOnCanvas(result: MindmapResult): void {
  const store = useWorkspaceStore.getState();
  const existingNodes = store.nodes;
  const existingEdges = store.edges;

  const maxY = existingNodes.reduce((m, n) => Math.max(m, n.position.y + 200), 0);
  const originX = 400;
  const originY = maxY + 80;

  const newNodes: import('../types').MiplerNode[] = [];
  const newEdges: import('../types').MiplerEdge[] = [];

  const answerId = `mm-answer-${uuidv4()}`;
  const answerNode = buildCardNode(
    answerId,
    { x: originX, y: originY },
    `📋 ${result.mindmap.root}`,
    result.answer,
    '#0f2a1a',
    true,
  );
  answerNode.data.width = 420;
  newNodes.push(answerNode);

  const addInsightCard = (
    title: string,
    lines: string[],
    position: { x: number; y: number },
    color: string,
    edgeColor: string,
  ) => {
    if (lines.length === 0) return;
    const nodeId = `mm-insight-${uuidv4()}`;
    const content = lines.map((line) => `• ${line}`).join('\n');
    const node = buildCardNode(nodeId, position, title, content, color, false, 'note');
    node.data.width = 320;
    newNodes.push(node);
    newEdges.push(buildEdge(answerId, nodeId, edgeColor, true));
  };

  const leadLines = (result.leads || []).map((lead) =>
    `${lead.priority.toUpperCase()}: ${lead.title}${lead.detail ? ` — ${lead.detail}` : ''}`,
  );
  const entityLines = (result.entities || []).map((entity) =>
    `${entity.name}${entity.type ? ` (${entity.type})` : ''}${entity.relevance ? ` — ${entity.relevance}` : ''}`,
  );
  const riskLines = result.risks || [];
  const nextQuestionLines = result.nextQuestions || [];
  const timelineLines = (result.timeline || []).map((event) =>
    `${event.date ? `${event.date}: ` : ''}${event.detail}`,
  );

  addInsightCard(
    'Executive Summary',
    result.executiveSummary ? [result.executiveSummary] : [],
    { x: originX - 460, y: originY - 20 },
    '#17263b',
    '#3b82f6',
  );
  addInsightCard(
    'Priority Leads',
    leadLines,
    { x: originX - 460, y: originY + 190 },
    '#14281f',
    '#22c55e',
  );
  addInsightCard(
    'Key Entities',
    entityLines,
    { x: originX + 690, y: originY - 20 },
    '#2c1c34',
    '#8b5cf6',
  );
  addInsightCard(
    'Risks',
    riskLines,
    { x: originX + 690, y: originY + 190 },
    '#331d1a',
    '#f97316',
  );
  addInsightCard(
    'Next Questions',
    nextQuestionLines,
    { x: originX + 690, y: originY + 400 },
    '#1a2736',
    '#06b6d4',
  );
  addInsightCard(
    'Timeline',
    timelineLines,
    { x: originX - 460, y: originY + 400 },
    '#2a2716',
    '#eab308',
  );

  const LEVEL_GAP_Y = 200;
  const NODE_GAP_X = 320;

  function layoutLevel(
    nodes: MMNode[],
    parentId: string,
    levelY: number,
    centreX: number,
    depth: number,
  ) {
    if (!nodes || nodes.length === 0) return;

    const colors = ['#1a2a4a', '#1a3a2a', '#2a1a3a', '#3a2a1a', '#1a3a3a'];
    const edgeColors = ['#3b82f6', '#22c55e', '#8b5cf6', '#f97316', '#06b6d4'];

    const totalWidth = (nodes.length - 1) * NODE_GAP_X;
    const startX = centreX - totalWidth / 2;

    nodes.forEach((node, i) => {
      const cardId = `mm-node-${node.id}-${uuidv4()}`;
      const posX = startX + i * NODE_GAP_X;
      const posY = levelY;

      const color = colors[depth % colors.length];
      const edgeColor = edgeColors[depth % edgeColors.length];

      const childSummary = node.children.length > 0
        ? '\n\nSub-topics:\n' + node.children.map(c => `  • ${c.label}`).join('\n')
        : '';

      const cardNode = buildCardNode(
        cardId,
        { x: posX, y: posY },
        node.label,
        `${node.label}${childSummary}`,
        color,
        true,
      );
      newNodes.push(cardNode);
      newEdges.push(buildEdge(parentId, cardId, edgeColor, true));
      layoutLevel(node.children, cardId, posY + LEVEL_GAP_Y, posX, depth + 1);
    });
  }

  layoutLevel(result.mindmap.nodes, answerId, originY + LEVEL_GAP_Y, originX + 210, 0);

  store.pushHistory();
  store.setNodes([...existingNodes, ...newNodes]);
  store.setEdges([...existingEdges, ...newEdges]);
  store.syncActiveInvestigation();
}
