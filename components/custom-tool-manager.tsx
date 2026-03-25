'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, TestTube } from 'lucide-react';
import { customToolManager, CustomTool } from '@/lib/custom-tools';
import { toast } from 'sonner';

export function CustomToolManager() {
  const [tools, setTools] = useState<CustomTool[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    apiEndpoint: '',
    apiMethod: 'GET',
    credentials: '',
  });
  const [testing, setTesting] = useState(false);

  // Load custom tools on mount
  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    const customTools = await customToolManager.listCustomTools();
    setTools(customTools);
  };

  const handleCreateTool = async () => {
    if (!formData.name || !formData.apiEndpoint) {
      toast.error('Please fill in name and API endpoint');
      return;
    }

    try {
      const credentials = formData.credentials ? JSON.parse(formData.credentials) : {};

      const newTool = await customToolManager.createCustomTool({
        name: formData.name,
        description: formData.description,
        category: formData.category || 'Custom',
        apiEndpoint: formData.apiEndpoint,
        apiMethod: (formData.apiMethod as 'GET' | 'POST') || 'GET',
        credentials,
      });

      if (newTool) {
        toast.success(`Tool "${formData.name}" created`);
        setFormData({
          name: '',
          description: '',
          category: '',
          apiEndpoint: '',
          apiMethod: 'GET',
          credentials: '',
        });
        setShowForm(false);
        await loadTools();
      }
    } catch (error: any) {
      toast.error(`Error creating tool: ${error.message}`);
    }
  };

  const handleDeleteTool = async (toolId: string) => {
    const tool = tools.find((t) => t.id === toolId);
    const deleted = await customToolManager.deleteCustomTool(toolId);

    if (deleted) {
      toast.success(`Tool "${tool?.name}" deleted`);
      await loadTools();
    } else {
      toast.error('Failed to delete tool');
    }
  };

  const handleTestEndpoint = async () => {
    if (!formData.apiEndpoint) {
      toast.error('Please enter an API endpoint');
      return;
    }

    setTesting(true);
    const isValid = await customToolManager.validateApiEndpoint(
      formData.apiEndpoint,
      formData.apiMethod
    );
    setTesting(false);

    if (isValid) {
      toast.success('Endpoint is reachable');
    } else {
      toast.error('Endpoint is not reachable');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">Custom Tools</h2>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New Tool
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm text-primary">Create Custom Tool</h3>

          <div className="space-y-2">
            <label className="text-xs font-semibold">Tool Name</label>
            <Input
              placeholder="e.g., VirusTotal Scanner"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="text-xs"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold">Description</label>
            <Input
              placeholder="What does this tool do?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="text-xs"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold">Category</label>
            <Input
              placeholder="e.g., Threat Intelligence"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="text-xs"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold">API Endpoint</label>
            <Input
              placeholder="https://api.example.com/scan"
              value={formData.apiEndpoint}
              onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
              className="text-xs"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold">API Method</label>
            <select
              value={formData.apiMethod}
              onChange={(e) => setFormData({ ...formData, apiMethod: e.target.value })}
              className="text-xs w-full px-3 py-2 rounded border border-border bg-secondary text-foreground"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold">Credentials (JSON)</label>
            <Textarea
              placeholder='{"api_key": "your-key", "api_secret": "your-secret"}'
              value={formData.credentials}
              onChange={(e) => setFormData({ ...formData, credentials: e.target.value })}
              className="text-xs font-mono min-h-20"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleTestEndpoint}
              disabled={testing || !formData.apiEndpoint}
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
            >
              <TestTube className="h-4 w-4" />
              {testing ? 'Testing...' : 'Test Endpoint'}
            </Button>
            <Button onClick={handleCreateTool} size="sm" className="flex-1">
              Create Tool
            </Button>
            <Button
              onClick={() => setShowForm(false)}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Tools List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {tools.length === 0 ? (
          <Card className="p-4 text-center">
            <p className="text-sm text-muted-foreground">No custom tools yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first custom tool to extend Mipler
            </p>
          </Card>
        ) : (
          tools.map((tool) => (
            <Card key={tool.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-foreground">{tool.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded">
                      {tool.category}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded">
                      {tool.apiMethod}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 font-mono break-all">
                    {tool.apiEndpoint}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => handleDeleteTool(tool.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Security Notice */}
      <Card className="p-3 bg-secondary/30 border-border">
        <p className="text-xs text-muted-foreground">
          Credentials are encrypted and stored locally. Never share your API keys or secrets.
        </p>
      </Card>
    </div>
  );
}
