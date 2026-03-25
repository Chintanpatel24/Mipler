'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Folder, Clock } from 'lucide-react';
import { useWorkflowStore } from '@/lib/workflow-store';
import { toast } from 'sonner';

interface InvestigationManagerProps {
  onSelectInvestigation?: (investigationId: string) => void;
}

export function InvestigationManager({ onSelectInvestigation }: InvestigationManagerProps) {
  const { investigations, createNewInvestigation, deleteInvestigation, currentInvestigation } =
    useWorkflowStore();
  const [newInvName, setNewInvName] = useState('');

  const handleCreateNew = () => {
    if (!newInvName.trim()) {
      toast.error('Please enter an investigation name');
      return;
    }

    const investigation = createNewInvestigation(newInvName);
    setNewInvName('');
    onSelectInvestigation?.(investigation.id);
    toast.success(`Investigation "${newInvName}" created`);
  };

  const handleDelete = (id: string) => {
    const inv = investigations.find((i) => i.id === id);
    deleteInvestigation(id);
    toast.success(`Investigation "${inv?.name}" deleted`);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-primary">Investigations</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Investigation name..."
            value={newInvName}
            onChange={(e) => setNewInvName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateNew()}
            className="text-sm"
          />
          <Button onClick={handleCreateNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {investigations.length === 0 ? (
          <Card className="p-6 text-center">
            <Folder className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No investigations yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create a new investigation to get started
            </p>
          </Card>
        ) : (
          investigations.map((investigation) => (
            <Card
              key={investigation.id}
              className={`p-3 cursor-pointer transition-all hover:border-primary/50 ${
                currentInvestigation?.id === investigation.id
                  ? 'border-primary border-2 bg-secondary/50'
                  : 'hover:bg-secondary/30'
              }`}
              onClick={() => onSelectInvestigation?.(investigation.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">
                    {investigation.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {new Date(investigation.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {investigation.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {investigation.description}
                    </p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded">
                      {investigation.nodes.length} nodes
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded">
                      {investigation.edges.length} edges
                    </span>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(investigation.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
