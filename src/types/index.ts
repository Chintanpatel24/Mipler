import type { Node, Edge } from 'reactflow';

export type CardType =
  | 'note'
  | 'image'
  | 'pdf'
  | 'whois'
  | 'dns'
  | 'reverse-image'
  | 'osint-framework'
  | 'custom-url';

export type LineStyle = 'dashed' | 'solid' | 'dotted';

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
}

export interface EdgeData {
  color: string;
  lineStyle: LineStyle;
  strokeWidth: number;
}

export type MiplerNode = Node<CardData>;
export type MiplerEdge = Edge<EdgeData>;

export interface Investigation {
  id: string;
  name: string;
  nodes: MiplerNode[];
  edges: MiplerEdge[];
  viewport: { x: number; y: number; zoom: number };
}

export interface WorkspaceState {
  id: string;
  name: string;
  investigations: Investigation[];
  activeInvestigationId: string;
  aiChatHistory?: AiMessage[];
  showDots: boolean;
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

export interface MindmapResult {
  answer: string;
  mindmap: {
    root: string;
    nodes: MindmapNode[];
  };
}
