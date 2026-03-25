'use client';

import { useEffect, useState } from 'react';
import { InvestigationManager } from '@/components/investigation-manager';
import { WorkflowEditor } from '@/components/workflow-editor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useWorkflowStore } from '@/lib/workflow-store';
import { investigationStorage } from '@/lib/storage';
import { Save, Settings, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function Home() {
  const {
    currentInvestigation,
    setCurrentInvestigation,
    investigations,
    setInvestigations,
    updateInvestigation,
  } = useWorkflowStore();
  const [isSaving, setIsSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Initialize storage on mount
  useEffect(() => {
    const initStorage = async () => {
      await investigationStorage.init();
      // Load any existing investigations from storage
      const result = await investigationStorage.listInvestigations();
      if (result.success && result.data) {
        setInvestigations(result.data);
      }
    };

    initStorage();
  }, [setInvestigations]);

  // Auto-save current investigation
  useEffect(() => {
    const autoSaveTimer = setInterval(async () => {
      if (currentInvestigation) {
        setIsSaving(true);
        const result = await investigationStorage.saveInvestigation(currentInvestigation);
        setIsSaving(false);

        if (!result.success) {
          console.error('Auto-save failed:', result.error);
        }
      }
    }, 10000); // Save every 10 seconds

    return () => clearInterval(autoSaveTimer);
  }, [currentInvestigation]);

  const handleSelectInvestigation = async (investigationId: string) => {
    const investigation = investigations.find((inv) => inv.id === investigationId);
    if (investigation) {
      setCurrentInvestigation(investigation);
    }
  };

  const handleSave = async () => {
    if (!currentInvestigation) {
      toast.error('No investigation selected');
      return;
    }

    setIsSaving(true);
    const result = await investigationStorage.saveInvestigation(currentInvestigation);
    setIsSaving(false);

    if (result.success) {
      toast.success('Investigation saved successfully');
      updateInvestigation(currentInvestigation);
    } else {
      toast.error(`Save failed: ${result.error}`);
    }
  };

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-secondary/50 backdrop-blur-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">MIPLER</h1>
            <p className="text-xs text-muted-foreground">OSINT Investigation Workspace</p>
          </div>

          <div className="flex items-center gap-3">
            {currentInvestigation && (
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {currentInvestigation.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentInvestigation.nodes.length} nodes • {currentInvestigation.edges.length}{' '}
                    connections
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!currentInvestigation || isSaving}
                size="sm"
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                onClick={() => setShowSettings(!showSettings)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex gap-4 p-4">
          {/* Sidebar */}
          <div className="w-80 border border-border rounded-lg bg-secondary/20 p-4 overflow-y-auto">
            <InvestigationManager onSelectInvestigation={handleSelectInvestigation} />

            {/* Quick Info */}
            {currentInvestigation && (
              <Card className="mt-6 p-4 space-y-3">
                <h3 className="font-semibold text-sm text-primary">Investigation Details</h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="text-foreground">
                      {new Date(currentInvestigation.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Updated</p>
                    <p className="text-foreground">
                      {new Date(currentInvestigation.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">ID</p>
                    <p className="text-foreground font-mono text-xs break-all">
                      {currentInvestigation.id}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Workflow Editor */}
          {currentInvestigation ? (
            <div className="flex-1 border border-border rounded-lg overflow-hidden">
              <WorkflowEditor investigationId={currentInvestigation.id} />
            </div>
          ) : (
            <div className="flex-1 border border-border rounded-lg bg-secondary/20 flex items-center justify-center">
              <Card className="text-center p-8">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  No Investigation Selected
                </h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Create a new investigation or select an existing one to get started
                </p>
                <p className="text-xs text-muted-foreground">
                  Build your OSINT workflow by connecting tools and data sources
                </p>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <footer className="border-t border-border bg-secondary/50 px-6 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <div>
          Investigations: <span className="font-semibold text-foreground">{investigations.length}</span>
        </div>
        <div>
          {isSaving && <span className="text-primary animate-pulse">Saving...</span>}
          {!isSaving && currentInvestigation && (
            <span className="text-green-500">Last saved: Auto-save enabled</span>
          )}
        </div>
      </footer>
    </div>
  );
}
