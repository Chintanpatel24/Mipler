import React, { useCallback } from 'react';
import { type EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import type { EdgeData } from '../../types';

export const RopeEdge: React.FC<EdgeProps<EdgeData>> = ({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, style = {}, markerEnd, data,
}) => {
  const setEdgeStyleModalOpen = useWorkspaceStore((s) => s.setEdgeStyleModalOpen);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    curvature: 0.25,
  });

  const color = data?.color || '#666666';
  const lineStyle = data?.lineStyle || 'dashed';
  const strokeWidth = data?.strokeWidth || 1.5;
  const dashMap: Record<string, string> = { dashed: '8 4', dotted: '3 4', solid: '0' };

  const open = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEdgeStyleModalOpen(true, id);
  }, [id, setEdgeStyleModalOpen]);

  return (
    <>
      {/* Fat invisible hit area */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} style={{ cursor: 'pointer' }} onDoubleClick={open} />
      
      {/* Main edge - no glow layer */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dashMap[lineStyle]}
        strokeLinecap="round"
        style={{ ...style, cursor: 'pointer' }}
        onDoubleClick={open}
      />
      
      {/* Endpoint dots - clean, no glow */}
      <circle cx={sourceX} cy={sourceY} r={4} fill={color} stroke="#1a1a1a" strokeWidth={1.5} />
      <circle cx={targetX} cy={targetY} r={4} fill={color} stroke="#1a1a1a" strokeWidth={1.5} />
      
      {/* Edit button on hover */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            onClick={open}
            style={{
              width: 18, height: 18, borderRadius: '50%',
              background: '#1a1a1a', border: '1px solid #333',
              color: '#666', fontSize: 9, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.15s',
              fontFamily: 'IBM Plex Mono, monospace',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = '#ccc'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
            title="Edit style"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M5 1L7 3L2.5 7.5L0.5 7.5L0.5 5.5L5 1Z"/>
            </svg>
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
