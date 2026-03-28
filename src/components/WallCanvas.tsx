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
import { ApiWorkspace } from './ApiWorkspace';
import type { CardType } from '../types';

const SNAP_RADIUS = 100; // Increased for easier connections

const Inner: React.FC = () => {
  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect,
    setViewport, setEdgeStyleModalOpen, showDots, undo, apiWorkspaceOpen,
  } = useWorkspaceStore();

  const rf = useReactFlow();
  const nodeTypes: NodeTypes = useMemo(() => ({ miplerCard: MiplerCardNode }), []);
  const edgeTypes: EdgeTypes = useMemo(() => ({ rope: RopeEdge }), []);

  // Track connecting state for magnetic snap
  const isConnecting = useRef(false);
  const connectSource = useRef<OnConnectStartParams | null>(null);

  // Ctrl+Z undo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo]);

  // ── Magnetic snap: while dragging a connection line, find the nearest
  //    node and add a CSS class that makes its handles swell visibly ──
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isConnecting.current) return;

    const flowBounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - flowBounds.left;
    const mouseY = e.clientY - flowBounds.top;

    // Get all node DOM elements and measure distance
    let closestNodeId: string | null = null;
    let closestDist = SNAP_RADIUS;

    for (const node of nodes) {
      // Skip the source node
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

    // Apply / remove attract class
    document.querySelectorAll('.react-flow__node.handle-attract').forEach((el) => {
      el.classList.remove('handle-attract');
    });
    if (closestNodeId) {
      const el = document.querySelector(`[data-id="${closestNodeId}"]`);
      el?.classList.add('handle-attract');
    }
  }, [nodes]);

  const handleConnectStart = useCallback((_: unknown, params: OnConnectStartParams) => {
    isConnecting.current = true;
    connectSource.current = params;
    // Mark all other nodes as potential targets
    for (const node of nodes) {
      if (node.id === params.nodeId) continue;
      const el = document.querySelector(`[data-id="${node.id}"]`);
      el?.classList.add('is-connecting-target');
    }
  }, [nodes]);

  const handleConnectEnd = useCallback((_e?: MouseEvent | TouchEvent) => {
    isConnecting.current = false;
    connectSource.current = null;
    // Clean up all visual states
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

  const rightPanelWidth = (apiWorkspaceOpen ? 480 : 0);

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
          style={{ background: '#111111', width: '100%', height: '100%' }}
        >
          {showDots && (
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2a2a2a"
              style={{ background: '#111111' }} />
          )}
          <Controls showInteractive={false} position="bottom-left"
            style={{ marginBottom: 10, marginLeft: 10 }} />
          {!apiWorkspaceOpen && (
            <MiniMap position="bottom-right" nodeColor={() => '#2a2a2a'}
              maskColor="rgba(0,0,0,0.7)"
              style={{ width: 140, height: 100, marginBottom: 10, marginRight: 10,
                background: '#161616', border: '1px solid #222', borderRadius: 6 }} />
          )}
        </ReactFlow>
      </div>

      {apiWorkspaceOpen && (
        <div style={{ display: 'flex', width: rightPanelWidth, transition: 'width 0.2s', overflow: 'hidden', flexShrink: 0 }}>
          {apiWorkspaceOpen && <ApiWorkspace />}
        </div>
      )}
    </div>
  );
};

export const WallCanvas: React.FC = () => (
  <ReactFlowProvider><Inner /></ReactFlowProvider>
);
