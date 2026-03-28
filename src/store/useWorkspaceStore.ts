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
} from '../types';

interface HistoryEntry {
  nodes: MiplerNode[];
  edges: MiplerEdge[];
}

interface WorkspaceStore {
  // Multi-investigation — two completely separate workspaces
  investigations: Investigation[];
  activeInvestigationId: string;

  nodes: MiplerNode[];
  edges: MiplerEdge[];
  viewport: { x: number; y: number; zoom: number };

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
  apiWorkspaceOpen: boolean;

  defaultEdgeColor: string;
  defaultLineStyle: LineStyle;
  defaultStrokeWidth: number;

  // Ollama config only
  llmBaseUrl: string;
  llmModel: string;
  aiChatHistory: AiMessage[];

  lastModified: number;

  setNodes: (nodes: MiplerNode[]) => void;
  setEdges: (edges: MiplerEdge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setViewport: (vp: { x: number; y: number; zoom: number }) => void;

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
  setApiWorkspaceOpen: (o: boolean) => void;
  setShowDots: (o: boolean) => void;

  setLlmBaseUrl: (u: string) => void;
  setLlmModel: (m: string) => void;
  addAiMessage: (msg: AiMessage) => void;
  clearAiChat: () => void;

  addInvestigation: () => string;
  removeInvestigation: (id: string) => void;
  switchInvestigation: (id: string) => void;
  renameInvestigation: (id: string, name: string) => void;
  getActiveInvestigation: () => Investigation;
  syncActiveInvestigation: () => void;

  getWorkspaceState: () => WorkspaceState;
  loadWorkspaceState: (state: WorkspaceState) => void;
  clearWorkspace: () => void;
}

function getDefaultTitle(type: CardType): string {
  const t: Record<CardType, string> = {
    note: 'Note', image: 'Image', pdf: 'Document', whois: 'WHOIS Lookup',
    dns: 'DNS Lookup', 'reverse-image': 'Reverse Image Search',
    'osint-framework': 'OSINT Framework', 'custom-url': 'Web Tool',
  };
  return t[type] || 'Card';
}

function getDefaultWidth(type: CardType): number {
  const w: Record<CardType, number> = {
    note: 300, image: 320, pdf: 360, whois: 360, dns: 360,
    'reverse-image': 440, 'osint-framework': 440, 'custom-url': 440,
  };
  return w[type] || 300;
}

const makeCardData = (type: CardType, extra?: Partial<CardData>): CardData => {
  const now = new Date().toISOString();
  return { cardType: type, title: getDefaultTitle(type), content: '', width: getDefaultWidth(type), cardColor: '#1e1e1e', createdAt: now, updatedAt: now, ...extra };
};

function createInvestigation(name?: string): Investigation {
  return {
    id: uuidv4(),
    name: name || 'Untitled Investigation',
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

const dashMap: Record<LineStyle, string> = { dashed: '8 4', dotted: '2 4', solid: '0' };

// Two separate investigations by default — each is its own workspace
const inv1 = createInvestigation('Workspace A');
const inv2 = createInvestigation('Workspace B');

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  investigations: [inv1, inv2],
  activeInvestigationId: inv1.id,
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },

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
  apiWorkspaceOpen: false,

  defaultEdgeColor: '#888888',
  defaultLineStyle: 'dashed',
  defaultStrokeWidth: 2,

  llmBaseUrl: 'http://localhost:11434',
  llmModel: 'llama3',
  aiChatHistory: [],

  lastModified: Date.now(),

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
    const edgeData: EdgeData = { color: s.defaultEdgeColor, lineStyle: s.defaultLineStyle, strokeWidth: s.defaultStrokeWidth };
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

  addCard: (type, position, extra) => {
    const s = get();
    s.pushHistory();
    const id = `card-${uuidv4()}`;
    const pos = position || { x: 150 + Math.random() * 300, y: 150 + Math.random() * 200 };
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
  setApiWorkspaceOpen: (o) => set({ apiWorkspaceOpen: o }),
  setShowDots: (o) => set({ showDots: o }),

  setLlmBaseUrl: (u) => set({ llmBaseUrl: u }),
  setLlmModel: (m) => set({ llmModel: m }),
  addAiMessage: (msg) => set((s) => ({ aiChatHistory: [...s.aiChatHistory, msg] })),
  clearAiChat: () => set({ aiChatHistory: [] }),

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
    });
  },

  renameInvestigation: (id, name) => {
    set((s) => ({
      investigations: s.investigations.map((i) => i.id === id ? { ...i, name } : i),
    }));
  },

  getWorkspaceState: (): WorkspaceState => {
    const s = get();
    s.syncActiveInvestigation();
    return {
      id: uuidv4(),
      name: 'Mipler Export',
      investigations: s.investigations,
      activeInvestigationId: s.activeInvestigationId,
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
      llmBaseUrl: (ws as any).llmBaseUrl || 'http://localhost:11434',
      llmModel: (ws as any).llmModel || 'llama3',
      aiChatHistory: ws.aiChatHistory || [],
      showDots: ws.showDots !== undefined ? ws.showDots : true,
      history: [],
      historyIndex: -1,
      lastModified: Date.now(),
    });
  },

  clearWorkspace: () => {
    // Only clear the ACTIVE workspace — do not touch the other
    const s = get();
    const clearedInv: Investigation = {
      ...s.getActiveInvestigation(),
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    set({
      investigations: s.investigations.map(i =>
        i.id === s.activeInvestigationId ? clearedInv : i
      ),
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      history: [],
      historyIndex: -1,
      lastModified: Date.now(),
    });
  },
}));

// ── Mindmap → Canvas ──────────────────────────────────────────────────────────
// Exported standalone so FileAnalysisPanel can call it directly without
// going through the store interface (keeps the store interface lean).
import type { MindmapNode as MMNode, MindmapResult } from '../types';

const DASH_MAP_LOCAL: Record<string, string> = { dashed: '8 4', dotted: '2 4', solid: '0' };

function buildCardNode(
  id: string,
  position: { x: number; y: number },
  title: string,
  content: string,
  cardColor: string,
): import('../types').MiplerNode {
  const now = new Date().toISOString();
  return {
    id,
    type: 'miplerCard',
    position,
    data: {
      cardType: 'note',
      title,
      content,
      width: 280,
      cardColor,
      createdAt: now,
      updatedAt: now,
    },
  };
}

function buildEdge(
  source: string,
  target: string,
  color = '#3b82f6',
): import('../types').MiplerEdge {
  return {
    id: `edge-${uuidv4()}`,
    source,
    target,
    sourceHandle: 'bottom-source',
    targetHandle: 'top-target',
    type: 'rope',
    animated: false,
    data: { color, lineStyle: 'dashed' as import('../types').LineStyle, strokeWidth: 2 },
    style: { stroke: color, strokeWidth: 2, strokeDasharray: DASH_MAP_LOCAL['dashed'] },
  };
}

/**
 * Spawns a full mindmap + answer onto the active canvas.
 * Layout:
 *   - Answer card at top-centre (wide, coloured green)
 *   - Level-1 nodes fanned out below it  → each connected to Answer
 *   - Level-2 nodes below each L1 node   → each connected to their L1 parent
 *   - (deeper levels continue downward)
 * Every edge ultimately traces back to the Answer card so the whole map
 * radiates from that single card.
 */
export function spawnMindmapOnCanvas(result: MindmapResult): void {
  const store = useWorkspaceStore.getState();
  const existingNodes = store.nodes;
  const existingEdges = store.edges;

  // Find a starting X/Y that doesn't overlap existing cards
  const maxY = existingNodes.reduce((m, n) => Math.max(m, n.position.y + 200), 0);
  const originX = 400;
  const originY = maxY + 80;

  const newNodes: import('../types').MiplerNode[] = [];
  const newEdges: import('../types').MiplerEdge[] = [];

  // ── Answer card (root) ────────────────────────────────────────────────────
  const answerId = `mm-answer-${uuidv4()}`;
  const answerNode = buildCardNode(
    answerId,
    { x: originX, y: originY },
    `📋 ${result.mindmap.root}`,
    result.answer,
    '#0f2a1a', // dark green tint
  );
  // Make it wider to hold the answer text
  answerNode.data.width = 420;
  newNodes.push(answerNode);

  // ── Recursively lay out nodes ─────────────────────────────────────────────
  const LEVEL_GAP_Y = 200;   // vertical gap between levels
  const NODE_GAP_X = 320;    // horizontal gap between siblings

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

      // Build descriptive content from children labels
      const childSummary = node.children.length > 0
        ? '\n\nSub-topics:\n' + node.children.map(c => `  • ${c.label}`).join('\n')
        : '';

      const cardNode = buildCardNode(
        cardId,
        { x: posX, y: posY },
        node.label,
        `${node.label}${childSummary}`,
        color,
      );
      newNodes.push(cardNode);

      // Edge from parent → this card (ALL ultimately trace back to Answer)
      newEdges.push(buildEdge(parentId, cardId, edgeColor));

      // Recurse into children — centred under this card
      layoutLevel(node.children, cardId, posY + LEVEL_GAP_Y, posX, depth + 1);
    });
  }

  layoutLevel(result.mindmap.nodes, answerId, originY + LEVEL_GAP_Y, originX + 210, 0);

  // ── Commit to store ───────────────────────────────────────────────────────
  store.pushHistory();
  store.setNodes([...existingNodes, ...newNodes]);
  store.setEdges([...existingEdges, ...newEdges]);
  store.syncActiveInvestigation();
}
