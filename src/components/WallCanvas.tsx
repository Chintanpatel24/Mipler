import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap, BackgroundVariant,
  type NodeTypes, type EdgeTypes, useReactFlow, ReactFlowProvider,
  type OnConnectStartParams, ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { MiplerCardNode } from './MiplerCardNode';
import { RopeEdge } from './edges/RopeEdge';
import { AgentSidebar } from './AgentSidebar';
import type { CardType } from '../types';

const SNAP_RADIUS = 100;

const Inner: React.FC = () => {
  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect,
    setViewport, setEdgeStyleModalOpen, showDots, undo,
    agentSidebarOpen, setLastPointerPosition,
  } = useWorkspaceStore();

  const activeInvestigationId = useWorkspaceStore(s => s.activeInvestigationId);
  const investigations = useWorkspaceStore(s => s.investigations);
  const activeInv = investigations.find(i => i.id === activeInvestigationId);
  const isAiWorkspace = activeInv?.isAiAnalysis || false;

  const rf = useReactFlow();
  const nodeTypes: NodeTypes = useMemo(() => ({ miplerCard: MiplerCardNode }), []);
  const edgeTypes: EdgeTypes = useMemo(() => ({ rope: RopeEdge }), []);

  const isConnecting = useRef(false);
  const connectSource = useRef<OnConnectStartParams | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const flowPos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setLastPointerPosition(flowPos);

    if (!isConnecting.current) return;
    const flowBounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - flowBounds.left;
    const mouseY = e.clientY - flowBounds.top;

    let closestNodeId: string | null = null;
    let closestDist = SNAP_RADIUS;

    for (const node of nodes) {
      if (node.id === connectSource.current?.nodeId) continue;
      const nodeEl = document.querySelector(`[data-id="${node.id}"]`) as HTMLElement | null;
      if (!nodeEl) continue;
      const rect = nodeEl.getBoundingClientRect();
      const nodeCx = rect.left - flowBounds.left + rect.width / 2;
      const nodeCy = rect.top - flowBounds.top + rect.height / 2;
      const dist = Math.hypot(mouseX - nodeCx, mouseY - nodeCy);
      if (dist < closestDist) {
        closestDist = dist;
        closestNodeId = node.id;
      }
    }

    document.querySelectorAll('.react-flow__node.handle-attract').forEach((el) => {
      el.classList.remove('handle-attract');
    });
    if (closestNodeId) {
      const el = document.querySelector(`[data-id="${closestNodeId}"]`);
      el?.classList.add('handle-attract');
    }
  }, [nodes, rf, setLastPointerPosition]);

  const handleConnectStart = useCallback((_: unknown, params: OnConnectStartParams) => {
    isConnecting.current = true;
    connectSource.current = params;
    for (const node of nodes) {
      if (node.id === params.nodeId) continue;
      const el = document.querySelector(`[data-id="${node.id}"]`);
      el?.classList.add('is-connecting-target');
    }
  }, [nodes]);

  const handleConnectEnd = useCallback((_e?: MouseEvent | TouchEvent) => {
    isConnecting.current = false;
    connectSource.current = null;
    document.querySelectorAll('.react-flow__node.handle-attract').forEach(el => el.classList.remove('handle-attract'));
    document.querySelectorAll('.react-flow__node.is-connecting-target').forEach(el => el.classList.remove('is-connecting-target'));
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/mipler-card-type');
    if (!type) return;
    const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    useWorkspaceStore.getState().addCard(type as CardType, pos);
  }, [rf]);

  const rightPanelWidth = agentSidebarOpen ? 320 : 0;

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={handleConnectStart}
          onConnectEnd={handleConnectEnd}
          onMouseMove={handleMouseMove}
          onEdgeDoubleClick={(_e, edge) => setEdgeStyleModalOpen(true, edge.id)}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: 'rope', animated: false }}
          onMoveEnd={(_e, vp) => setViewport(vp)}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
          onDrop={onDrop}
          fitView={false}
          snapToGrid
          snapGrid={[16, 16]}
          deleteKeyCode={['Backspace', 'Delete']}
          connectionLineStyle={{ stroke: '#888', strokeWidth: 1.5, strokeDasharray: '5 3' }}
          connectionRadius={SNAP_RADIUS}
          connectionMode={ConnectionMode.Loose}
          minZoom={0.05}
          maxZoom={5}
          proOptions={{ hideAttribution: true }}
          style={{ background: isAiWorkspace ? '#0e0e14' : '#111111', width: '100%', height: '100%' }}
        >
          {(showDots || isAiWorkspace) && (
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color={isAiWorkspace ? '#1e1e28' : '#2a2a2a'}
              style={{ background: isAiWorkspace ? '#0e0e14' : '#111111' }} />
          )}
          <Controls showInteractive={false} position="bottom-left"
            style={{ marginBottom: 10, marginLeft: 10 }} />
          {!agentSidebarOpen && (
            <MiniMap position="bottom-right" nodeColor={(node) => {
              const type = node.data?.cardType;
              if (type === 'agent') return '#1a2a4a';
              if (type === 'agent-output') return '#1a1a2a';
              if (type === 'ai-generated') return '#1a2a3a';
              if (type === 'prediction') return '#2a1a3a';
              if (type === 'import-card') return '#1a2a1a';
              if (type === 'investigation-preview') return '#10202a';
              if (type === 'report-agent') return '#2a1a1a';
              if (type === 'agent-answer') return '#1a1a2a';
              if (type === 'question-card') return '#2a2a1a';
              if (type === 'data-supplier') return '#1a2a2a';
              if (type === 'agent-group') return '#1a1a3a';
              if (type === 'card-maker') return '#2a1a2a';
              if (type === 'title-card') return '#1e1e2a';
              if (type === 'http-request' || type === 'webhook') return '#1a2a3a';
              if (type === 'code-exec') return '#2a2a1a';
              if (type === 'transform' || type === 'merge') return '#1a2a2a';
              if (type === 'condition' || type === 'loop') return '#2a1a2a';
              if (type === 'swarm-agent') return '#1a1a3a';
              if (type?.startsWith('osint-')) return '#1a2a1a';
              if (type === 'trigger') return '#2a2a1e';
              return '#2a2a2a';
            }}
              maskColor="rgba(0,0,0,0.7)"
              style={{ width: 140, height: 100, marginBottom: 10, marginRight: 10,
                background: '#161616', border: '1px solid #222', borderRadius: 6 }} />
          )}
        </ReactFlow>
      </div>

      {agentSidebarOpen && (
        <div style={{ display: 'flex', width: 320, transition: 'width 0.2s', overflow: 'hidden', flexShrink: 0 }}>
          <AgentSidebar />
        </div>
      )}
    </div>
  );
};

export const WallCanvas: React.FC = () => (
  <ReactFlowProvider><Inner /></ReactFlowProvider>
);
