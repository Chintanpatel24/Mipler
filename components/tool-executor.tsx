'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Play, Copy, Trash2 } from 'lucide-react';
import { OSINT_TOOLS, getToolsByCategory, getAllCategories } from '@/lib/osint-tools';
import { toast } from 'sonner';

interface ToolExecutorProps {
  onResult?: (result: any) => void;
}

export function ToolExecutor({ onResult }: ToolExecutorProps) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const categories = getAllCategories();
  const tool = selectedTool ? OSINT_TOOLS.find((t) => t.id === selectedTool) : null;

  const handleExecute = async () => {
    if (!tool || !input.trim()) {
      toast.error('Please select a tool and enter input');
      return;
    }

    setLoading(true);
    try {
      const toolResult = await tool.execute(input);
      setResult(toolResult);
      onResult?.(toolResult);

      if (toolResult.success) {
        toast.success(`${tool.name} executed successfully`);
      } else {
        toast.error(`Execution failed: ${toolResult.error}`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const text =
      typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setInput('');
    setResult(null);
  };

  return (
    <div className="space-y-4">
      {/* Tool Selection */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-sm text-primary">Tools</h3>

        <div className="space-y-3">
          {categories.map((category) => (
            <div key={category} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">{category}</p>
              <div className="grid grid-cols-2 gap-2">
                {getToolsByCategory(category).map((tool) => (
                  <Button
                    key={tool.id}
                    onClick={() => setSelectedTool(tool.id)}
                    variant={selectedTool === tool.id ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs justify-start"
                    title={tool.description}
                  >
                    {tool.name}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tool Details and Execution */}
      {tool && (
        <Card className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-sm text-primary">{tool.name}</h3>
            <p className="text-xs text-muted-foreground">{tool.description}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground block">Input</label>
            {tool.id.includes('extractor') || tool.id.includes('formatter') ? (
              <Textarea
                placeholder="Enter your data (can be multiple lines)..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="text-xs font-mono min-h-24"
              />
            ) : (
              <Input
                placeholder="Enter data to process..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="text-xs"
              />
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleExecute}
              disabled={loading || !input.trim()}
              className="flex-1 gap-2 text-sm"
            >
              <Play className="h-4 w-4" />
              {loading ? 'Executing...' : 'Execute'}
            </Button>
            {input && (
              <Button
                onClick={handleClear}
                variant="outline"
                size="icon"
                className="text-xs"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-primary">Result</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="gap-2 text-xs"
            >
              <Copy className="h-3 w-3" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>

          {result.success ? (
            <div className="space-y-2">
              {typeof result === 'object' ? (
                Object.entries(result).map(([key, value]) => {
                  if (key === 'success') return null;
                  return (
                    <div key={key} className="text-xs">
                      <p className="font-semibold text-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-muted-foreground font-mono">
                        {Array.isArray(value)
                          ? value.join('\n')
                          : typeof value === 'string'
                            ? value
                            : JSON.stringify(value)}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
                  {result}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-destructive">{result.error}</p>
          )}
        </Card>
      )}
    </div>
  );
}
