'use client';

import { Handle, Position } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Copy } from 'lucide-react';
import { useState } from 'react';

interface OutputNodeProps {
  data: {
    label: string;
    result?: any;
    onDelete?: (nodeId: string) => void;
  };
  id: string;
  selected?: boolean;
}

export function OutputNode({ data, id, selected }: OutputNodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayResult = data.result
    ? typeof data.result === 'string'
      ? data.result
      : JSON.stringify(data.result, null, 2)
    : 'No result yet';

  return (
    <Card
      className={`w-64 p-3 transition-all ${
        selected
          ? 'border-primary border-2 shadow-lg shadow-primary/50'
          : 'border-border border'
      } hover:shadow-md bg-secondary/30 max-h-80 overflow-hidden`}
    >
      <div className="space-y-2 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-primary">Output</h3>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy to clipboard'}
            >
              <Copy className="h-4 w-4" />
            </Button>
            {data.onDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => data.onDelete?.(id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="text-xs bg-background/50 p-2 rounded border border-border overflow-auto max-h-48 font-mono">
          <pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
            {displayResult}
          </pre>
        </div>

        <p className="text-xs text-muted-foreground">{data.label}</p>
      </div>

      <Handle type="target" position={Position.Top} />
    </Card>
  );
}
