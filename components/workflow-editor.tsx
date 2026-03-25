'use client';

import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ToolNode } from './nodes/tool-node';
import { InputNode } from './nodes/input-node';
import { OutputNode } from './nodes/output-node';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { useWorkflowStore } from '@/lib/workflow-store';

const nodeTypes: NodeTypes = {
  tool: ToolNode,
  input: InputNode,
  output: OutputNode,
};

interface WorkflowEditorProps {
  investigationId?: string;
}

export function WorkflowEditor({ investigationId }: WorkflowEditorProps) {
  const { nodes, edges, addNode, setNodes, setEdges, removeNode, removeEdge } = useWorkflowStore();
  const [localNodes, setLocalNodes] = useNodesState(nodes);
  const [localEdges, setLocalEdges] = useEdgesState(edges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const handleNodesChange = useCallback(
    (changes: any) => {
      setLocalNodes((nds: Node[]) => {
        const updatedNodes = nds;
        changes.forEach((change: any) => {
          if (change.type === 'select') {
            // Handle selection
          } else if (change.type === 'position') {
            const node = updatedNodes.find((n) => n.id === change.id);
            if (node) {
              node.position = change.position;
            }
          }
        });
        return updatedNodes;
      });
    },
    [setLocalNodes]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      setLocalEdges((eds: Edge[]) => {
        const updatedEdges = eds;
        changes.forEach((change: any) => {
          if (change.type === 'remove') {
            removeEdge(change.id);
          }
        });
        return updatedEdges;
      });
    },
    [setLocalEdges, removeEdge]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        id: `edge_${Date.now()}_${Math.random()}`,
        ...connection,
      };
      setLocalEdges((eds) => addEdge(newEdge, eds));
    },
    [setLocalEdges]
  );

  const addToolNode = (toolId: string) => {
    if (!reactFlowWrapper.current) return;

    const newNode: Node = {
      id: `node_${Date.now()}_${Math.random()}`,
      data: {
        toolId,
        label: toolId,
        onDelete: (nodeId: string) => {
          removeNode(nodeId);
          setLocalNodes((nds) => nds.filter((n) => n.id !== nodeId));
          setLocalEdges((eds) =>
            eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
          );
        },
      },
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      type: 'tool',
    };

    addNode(newNode);
    setLocalNodes((nds) => [...nds, newNode]);
  };

  const addInputNode = () => {
    const newNode: Node = {
      id: `input_${Date.now()}_${Math.random()}`,
      data: {
        label: 'Input Data',
        placeholder: 'Enter your data here',
        onDelete: (nodeId: string) => {
          removeNode(nodeId);
          setLocalNodes((nds) => nds.filter((n) => n.id !== nodeId));
        },
      },
      position: { x: 100, y: 100 },
      type: 'input',
    };

    addNode(newNode);
    setLocalNodes((nds) => [...nds, newNode]);
  };

  const addOutputNode = () => {
    const newNode: Node = {
      id: `output_${Date.now()}_${Math.random()}`,
      data: {
        label: 'Output',
        result: null,
        onDelete: (nodeId: string) => {
          removeNode(nodeId);
          setLocalNodes((nds) => nds.filter((n) => n.id !== nodeId));
        },
      },
      position: { x: 800, y: 100 },
      type: 'output',
    };

    addNode(newNode);
    setLocalNodes((nds) => [...nds, newNode]);
  };

  const clearWorkflow = () => {
    setLocalNodes([]);
    setLocalEdges([]);
  };

  return (
    <div className="flex h-full gap-4">
      {/* Sidebar with tools */}
      <div className="w-64 border-r border-border bg-secondary/20 p-4 overflow-y-auto">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-primary mb-3">Nodes</h3>
            <div className="space-y-2">
              <Button
                onClick={addInputNode}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
              >
                <Plus className="h-3 w-3 mr-2" />
                Input Node
              </Button>
              <Button
                onClick={addOutputNode}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
              >
                <Plus className="h-3 w-3 mr-2" />
                Output Node
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-primary mb-3">Tools</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <Card className="p-3 space-y-2">
                <p className="text-xs text-muted-foreground">Encoding</p>
                {['url_decoder', 'url_encoder', 'base64_encoder', 'base64_decoder'].map(
                  (toolId) => (
                    <Button
                      key={toolId}
                      onClick={() => addToolNode(toolId)}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-8"
                    >
                      {toolId.replace(/_/g, ' ')}
                    </Button>
                  )
                )}
              </Card>

              <Card className="p-3 space-y-2">
                <p className="text-xs text-muted-foreground">Hashing</p>
                {['md5_hash', 'sha256_hash'].map((toolId) => (
                  <Button
                    key={toolId}
                    onClick={() => addToolNode(toolId)}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-8"
                  >
                    {toolId.replace(/_/g, ' ')}
                  </Button>
                ))}
              </Card>

              <Card className="p-3 space-y-2">
                <p className="text-xs text-muted-foreground">Email</p>
                {['email_validator', 'email_extractor'].map((toolId) => (
                  <Button
                    key={toolId}
                    onClick={() => addToolNode(toolId)}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-8"
                  >
                    {toolId.replace(/_/g, ' ')}
                  </Button>
                ))}
              </Card>

              <Card className="p-3 space-y-2">
                <p className="text-xs text-muted-foreground">Network</p>
                {['ip_validator', 'ip_extractor', 'domain_extractor', 'domain_validator'].map(
                  (toolId) => (
                    <Button
                      key={toolId}
                      onClick={() => addToolNode(toolId)}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-8"
                    >
                      {toolId.replace(/_/g, ' ')}
                    </Button>
                  )
                )}
              </Card>

              <Card className="p-3 space-y-2">
                <p className="text-xs text-muted-foreground">Formatting</p>
                {['json_formatter', 'phone_extractor'].map((toolId) => (
                  <Button
                    key={toolId}
                    onClick={() => addToolNode(toolId)}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-8"
                  >
                    {toolId.replace(/_/g, ' ')}
                  </Button>
                ))}
              </Card>
            </div>
          </div>

          <Button
            onClick={clearWorkflow}
            variant="destructive"
            size="sm"
            className="w-full justify-start text-xs"
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Clear Workflow
          </Button>
        </div>
      </div>

      {/* Workflow canvas */}
      <div ref={reactFlowWrapper} className="flex-1 bg-background rounded-lg overflow-hidden">
        <ReactFlow
          nodes={localNodes}
          edges={localEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#1a1a1a" gap={16} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
