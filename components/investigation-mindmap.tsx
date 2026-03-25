'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Node, Edge } from 'reactflow';
import { getToolById } from '@/lib/osint-tools';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface InvestigationMindmapProps {
  nodes: Node[];
  edges: Edge[];
}

interface MindmapNode {
  id: string;
  label: string;
  type: string;
  children: MindmapNode[];
  data?: any;
}

export function InvestigationMindmap({ nodes, edges }: InvestigationMindmapProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const mindmapTree = useMemo(() => {
    // Build tree structure from nodes and edges
    const nodeMap = new Map<string, Node>();
    nodes.forEach((node) => {
      nodeMap.set(node.id, node);
    });

    // Find root nodes (input nodes or nodes with no incoming edges)
    const incomingEdges = new Set<string>();
    edges.forEach((edge) => {
      incomingEdges.add(edge.target);
    });

    const rootNodeIds = nodes
      .filter((node) => node.type === 'input' || !incomingEdges.has(node.id))
      .map((node) => node.id);

    // Build tree recursively
    const buildTree = (nodeId: string, visited = new Set<string>()): MindmapNode | null => {
      if (visited.has(nodeId)) return null; // Prevent cycles
      visited.add(nodeId);

      const node = nodeMap.get(nodeId);
      if (!node) return null;

      let label = node.data?.label || nodeId;

      if (node.type === 'tool') {
        const tool = getToolById(node.data?.toolId);
        label = tool?.name || label;
      }

      const childNodeIds = edges
        .filter((edge) => edge.source === nodeId)
        .map((edge) => edge.target);

      const children: MindmapNode[] = [];
      for (const childId of childNodeIds) {
        const child = buildTree(childId, new Set(visited));
        if (child) children.push(child);
      }

      return {
        id: nodeId,
        label,
        type: node.type || 'unknown',
        children,
        data: node.data,
      };
    };

    const trees: MindmapNode[] = [];
    for (const rootId of rootNodeIds) {
      const tree = buildTree(rootId);
      if (tree) trees.push(tree);
    }

    return trees;
  }, [nodes, edges]);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const TreeNode = ({ node, depth = 0 }: { node: MindmapNode; depth?: number }) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;

    const typeColors: Record<string, string> = {
      input: 'border-l-blue-500 bg-blue-500/10',
      tool: 'border-l-cyan-500 bg-cyan-500/10',
      output: 'border-l-green-500 bg-green-500/10',
    };

    const typeLabels: Record<string, string> = {
      input: 'Input',
      tool: 'Tool',
      output: 'Output',
    };

    return (
      <div key={node.id} className="space-y-1">
        <div className={`flex items-center gap-2 pl-${depth * 4} py-1`}>
          {hasChildren && (
            <button
              onClick={() => toggleNode(node.id)}
              className="p-0.5 hover:bg-secondary rounded"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-primary" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          <div
            className={`flex-1 px-2 py-1 rounded text-xs border-l-4 ${typeColors[node.type] || 'border-l-gray-500 bg-gray-500/10'}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-1.5 py-0.5 bg-secondary rounded">
                {typeLabels[node.type] || node.type}
              </span>
              <span className="text-foreground font-medium truncate">{node.label}</span>
            </div>
            {node.data?.description && (
              <p className="text-muted-foreground text-xs mt-1">{node.data.description}</p>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-border ml-2">
            {node.children.map((child) => (
              <TreeNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-semibold text-sm text-primary">Investigation Structure</h3>

      {mindmapTree.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No workflow nodes to display. Create your first node to see the structure here.
        </p>
      ) : (
        <div className="space-y-2 text-xs">
          {mindmapTree.map((tree) => (
            <TreeNode key={tree.id} node={tree} />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="pt-3 border-t border-border space-y-2 text-xs">
        <p className="font-semibold text-muted-foreground">Legend</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-l-4 border-l-blue-500 bg-blue-500/10 rounded" />
            <span>Input Node</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-l-4 border-l-cyan-500 bg-cyan-500/10 rounded" />
            <span>Tool Node</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-l-4 border-l-green-500 bg-green-500/10 rounded" />
            <span>Output Node</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
