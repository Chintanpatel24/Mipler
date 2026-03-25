import { create } from 'zustand';
import { Node, Edge } from 'reactflow';

export interface Investigation {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  nodes: Node[];
  edges: Edge[];
  metadata: Record<string, any>;
}

interface WorkflowStore {
  // Investigation management
  investigations: Investigation[];
  currentInvestigation: Investigation | null;
  loading: boolean;
  error: string | null;

  // Workflow management
  nodes: Node[];
  edges: Edge[];

  // Actions
  setInvestigations: (investigations: Investigation[]) => void;
  setCurrentInvestigation: (investigation: Investigation | null) => void;
  createNewInvestigation: (name: string, description?: string) => Investigation;
  updateInvestigation: (investigation: Investigation) => void;
  deleteInvestigation: (id: string) => void;

  // Workflow actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  addEdge: (edge: Edge) => void;
  updateNode: (nodeId: string, data: any) => void;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
  clearWorkflow: () => void;

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  // Initial state
  investigations: [],
  currentInvestigation: null,
  loading: false,
  error: null,
  nodes: [],
  edges: [],

  // Investigation actions
  setInvestigations: (investigations) => set({ investigations }),

  setCurrentInvestigation: (investigation) => {
    set({
      currentInvestigation: investigation,
      nodes: investigation?.nodes || [],
      edges: investigation?.edges || [],
    });
  },

  createNewInvestigation: (name: string, description: string = '') => {
    const investigation: Investigation = {
      id: generateId(),
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [],
      edges: [],
      metadata: {},
    };

    set((state) => ({
      investigations: [...state.investigations, investigation],
      currentInvestigation: investigation,
      nodes: [],
      edges: [],
    }));

    return investigation;
  },

  updateInvestigation: (investigation: Investigation) => {
    set((state) => ({
      investigations: state.investigations.map((inv) =>
        inv.id === investigation.id
          ? { ...investigation, updatedAt: new Date().toISOString() }
          : inv
      ),
      currentInvestigation:
        state.currentInvestigation?.id === investigation.id
          ? investigation
          : state.currentInvestigation,
    }));
  },

  deleteInvestigation: (id: string) => {
    set((state) => ({
      investigations: state.investigations.filter((inv) => inv.id !== id),
      currentInvestigation: state.currentInvestigation?.id === id ? null : state.currentInvestigation,
    }));
  },

  // Workflow actions
  setNodes: (nodes) => {
    set({ nodes });
    set((state) => {
      if (state.currentInvestigation) {
        return {
          currentInvestigation: {
            ...state.currentInvestigation,
            nodes,
          },
        };
      }
      return {};
    });
  },

  setEdges: (edges) => {
    set({ edges });
    set((state) => {
      if (state.currentInvestigation) {
        return {
          currentInvestigation: {
            ...state.currentInvestigation,
            edges,
          },
        };
      }
      return {};
    });
  },

  addNode: (node) =>
    set((state) => {
      const newNodes = [...state.nodes, node];
      const updatedInvestigation = state.currentInvestigation
        ? { ...state.currentInvestigation, nodes: newNodes }
        : null;
      return {
        nodes: newNodes,
        currentInvestigation: updatedInvestigation,
      };
    }),

  addEdge: (edge) =>
    set((state) => {
      const newEdges = [...state.edges, edge];
      const updatedInvestigation = state.currentInvestigation
        ? { ...state.currentInvestigation, edges: newEdges }
        : null;
      return {
        edges: newEdges,
        currentInvestigation: updatedInvestigation,
      };
    }),

  updateNode: (nodeId: string, data: any) =>
    set((state) => {
      const newNodes = state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      );
      const updatedInvestigation = state.currentInvestigation
        ? { ...state.currentInvestigation, nodes: newNodes }
        : null;
      return {
        nodes: newNodes,
        currentInvestigation: updatedInvestigation,
      };
    }),

  removeNode: (nodeId: string) =>
    set((state) => {
      const newNodes = state.nodes.filter((node) => node.id !== nodeId);
      const newEdges = state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      );
      const updatedInvestigation = state.currentInvestigation
        ? {
            ...state.currentInvestigation,
            nodes: newNodes,
            edges: newEdges,
          }
        : null;
      return {
        nodes: newNodes,
        edges: newEdges,
        currentInvestigation: updatedInvestigation,
      };
    }),

  removeEdge: (edgeId: string) =>
    set((state) => {
      const newEdges = state.edges.filter((edge) => edge.id !== edgeId);
      const updatedInvestigation = state.currentInvestigation
        ? { ...state.currentInvestigation, edges: newEdges }
        : null;
      return {
        edges: newEdges,
        currentInvestigation: updatedInvestigation,
      };
    }),

  clearWorkflow: () =>
    set({
      nodes: [],
      edges: [],
    }),

  // State management
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
