'use client';

import { Handle, Position } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface InputNodeProps {
  data: {
    label: string;
    value?: string;
    placeholder?: string;
    onDelete?: (nodeId: string) => void;
  };
  id: string;
  selected?: boolean;
}

export function InputNode({ data, id, selected }: InputNodeProps) {
  return (
    <Card
      className={`w-64 p-3 transition-all ${
        selected
          ? 'border-primary border-2 shadow-lg shadow-primary/50'
          : 'border-border border'
      } hover:shadow-md bg-secondary/30`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-primary">Input Data</h3>
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

        <Input
          placeholder={data.placeholder || 'Enter data...'}
          defaultValue={data.value}
          className="text-xs"
          disabled
        />

        <p className="text-xs text-muted-foreground">{data.label}</p>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </Card>
  );
}
