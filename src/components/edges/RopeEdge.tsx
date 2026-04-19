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
  const isGlowing = data?.isGlowing || false;
  const dataFlowActive = data?.dataFlowActive || false;
  const payloadType = data?.payloadType || '';
  const payloadSize = data?.payloadSize || 0;
  const dashMap: Record<string, string> = { dashed: '8 4', dotted: '3 4', solid: '0' };

  const open = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEdgeStyleModalOpen(true, id);
  }, [id, setEdgeStyleModalOpen]);

  const glowId = `glow-${id.replace(/[^a-zA-Z0-9]/g, '')}`;
  const flowId = `flow-${id.replace(/[^a-zA-Z0-9]/g, '')}`;

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <>
      {/* Glow filter definition */}
      {isGlowing && (
        <defs>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix in="blur" type="matrix"
              values={`0 0 0 0 ${parseInt(color.slice(1,3),16)/255}
                       0 0 0 0 ${parseInt(color.slice(3,5),16)/255}
                       0 0 0 0 ${parseInt(color.slice(5,7),16)/255}
                       0 0 0 0.6 0`} result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Electric current filter */}
          <filter id={flowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feColorMatrix in="blur" type="matrix"
              values={`0 0 0 0 ${parseInt(color.slice(1,3),16)/255 * 1.2}
                       0 0 0 0 ${parseInt(color.slice(3,5),16)/255 * 1.2}
                       0 0 0 0 ${parseInt(color.slice(5,7),16)/255 * 1.2}
                       0 0 0 0.8 0`} result="bright" />
            <feMerge>
              <feMergeNode in="bright" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}

      {/* Fat invisible hit area */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} style={{ cursor: 'pointer' }} onDoubleClick={open} />

      {/* Glow layer underneath */}
      {isGlowing && (
        <path
          d={edgePath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 8}
          strokeLinecap="round"
          strokeDasharray={dashMap[lineStyle]}
          style={{ opacity: 0.2, filter: `url(#${glowId})` }}
        />
      )}

      {/* Flowing current particles - n8n style */}
      {dataFlowActive && (
        <>
          {/* Primary large particles */}
          <circle r="4" fill={color} style={{ opacity: 0.9, filter: `url(#${flowId})` }}>
            <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
          </circle>
          <circle r="3" fill={color} style={{ opacity: 0.7 }}>
            <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} begin="0.4s" />
          </circle>
          <circle r="3.5" fill={color} style={{ opacity: 0.8, filter: `url(#${flowId})` }}>
            <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} begin="0.8s" />
          </circle>
          <circle r="2.5" fill={color} style={{ opacity: 0.6 }}>
            <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} begin="1.2s" />
          </circle>
          <circle r="3" fill={color} style={{ opacity: 0.75, filter: `url(#${flowId})` }}>
            <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} begin="1.6s" />
          </circle>

          {/* Trailing smaller particles for electric feel */}
          <circle r="1.5" fill="#ffffff" style={{ opacity: 0.4 }}>
            <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} begin="0.2s" />
          </circle>
          <circle r="1" fill="#ffffff" style={{ opacity: 0.3 }}>
            <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} begin="0.7s" />
          </circle>
          <circle r="1.5" fill="#ffffff" style={{ opacity: 0.35 }}>
            <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} begin="1.3s" />
          </circle>

          {/* Energy pulse along the line */}
          <circle r="6" fill={color} style={{ opacity: 0.15 }}>
            <animateMotion dur="3s" repeatCount="indefinite" path={edgePath} />
            <animate attributeName="r" values="6;10;6" dur="3s" repeatCount="indefinite" />
          </circle>
        </>
      )}

      {/* Main edge */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        fill="none"
        stroke={color}
        strokeWidth={isGlowing ? strokeWidth + 1 : strokeWidth}
        strokeDasharray={dashMap[lineStyle]}
        strokeLinecap="round"
        style={{
          ...style,
          cursor: 'pointer',
          filter: isGlowing ? `url(#${glowId})` : undefined,
          transition: 'stroke-width 0.3s',
        }}
        onDoubleClick={open}
      />

      {/* Endpoint dots */}
      <circle cx={sourceX} cy={sourceY} r={isGlowing ? 5 : 4} fill={color} stroke="#1a1a1a" strokeWidth={1.5}
        style={{ transition: 'r 0.3s' }} />
      <circle cx={targetX} cy={targetY} r={isGlowing ? 5 : 4} fill={color} stroke="#1a1a1a" strokeWidth={1.5}
        style={{ transition: 'r 0.3s' }} />

      {/* Flowing energy indicator dots at endpoints */}
      {dataFlowActive && (
        <>
          <circle cx={sourceX} cy={sourceY} r="8" fill={color} style={{ opacity: 0.15 }}>
            <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.15;0.05;0.15" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx={targetX} cy={targetY} r="8" fill={color} style={{ opacity: 0.15 }}>
            <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" begin="0.75s" />
            <animate attributeName="opacity" values="0.15;0.05;0.15" dur="1.5s" repeatCount="indefinite" begin="0.75s" />
          </circle>
        </>
      )}

      {/* Edit button + data indicator on hover */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
          }}
          className="nodrag nopan"
        >
          {/* Data flow type badge */}
          {(payloadType || dataFlowActive) && (
            <div style={{
              padding: '1px 5px',
              background: dataFlowActive ? color + '22' : '#1a1a1a',
              border: `1px solid ${dataFlowActive ? color + '55' : '#333'}`,
              borderRadius: 3,
              fontSize: 7,
              color: dataFlowActive ? color : '#555',
              fontFamily: 'IBM Plex Mono',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              opacity: 0.9,
            }}>
              {payloadType}{payloadSize > 0 ? ` ${formatSize(payloadSize)}` : ''}
            </div>
          )}
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
