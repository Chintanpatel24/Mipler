'use client';

import { Handle, Position } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { getToolById } from '@/lib/osint-tools';

interface ToolNodeProps {
  data: {
    toolId: string;
    label: string;
    onDelete?: (nodeId: string) => void;
  };
  id: string;
  isConnecting?: boolean;
  selected?: boolean;
}

export function ToolNode({ data, id, selected }: ToolNodeProps) {
  const tool = getToolById(data.toolId);

  if (!tool) {
    return (
      <Card className="w-48 p-4 border-red-500 border-2">
        <p className="text-sm text-red-400">Tool not found: {data.toolId}</p>
      </Card>
    );
  }

  return (
    <Card
      className={`w-56 p-3 transition-all ${
        selected
          ? 'border-primary border-2 shadow-lg shadow-primary/50'
          : 'border-border border'
      } hover:shadow-md`}
    >
      <Handle type="target" position={Position.Top} />

      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-primary truncate">{tool.name}</h3>
            <p className="text-xs text-muted-foreground">{tool.category}</p>
          </div>
          {data.onDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 -mr-2 -mt-1"
              onClick={() => data.onDelete?.(id)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p>

        <div className="flex gap-1 flex-wrap">
          <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded">
            {tool.category}
          </span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </Card>
  );
}
