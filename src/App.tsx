import React, { useEffect } from 'react';
import { WallCanvas } from './components/WallCanvas';
import { Toolbar } from './components/Toolbar';
import { ExportModal } from './components/modals/ExportModal';
import { ImportModal } from './components/modals/ImportModal';
import { CustomUrlModal } from './components/modals/CustomUrlModal';
import { EdgeStyleModal } from './components/modals/EdgeStyleModal';
import { ApiSettingsModal } from './components/modals/ApiSettingsModal';
import { CombineModal } from './components/modals/CombineModal';
import { ImportDataModal } from './components/modals/ImportDataModal';
import { FileAnalysisPanel } from './components/FileAnalysisPanel';
import { useWorkspaceStore } from './store/useWorkspaceStore';

const App: React.FC = () => {
  const aiPanelOpen = useWorkspaceStore(s => s.aiPanelOpen);
  const loadFromLocalFile = useWorkspaceStore(s => s.loadFromLocalFile);
  const saveToLocalFile = useWorkspaceStore(s => s.saveToLocalFile);
  const lastModified = useWorkspaceStore(s => s.lastModified);

  useEffect(() => {
    const init = async () => {
      await loadFromLocalFile();
    };
    void init();
  }, [loadFromLocalFile]);

  // Save workspace frequently after edits.
  useEffect(() => {
    const timer = setTimeout(() => {
      saveToLocalFile();
    }, 450);
    return () => clearTimeout(timer);
  }, [lastModified, saveToLocalFile]);

  // Ctrl+S explicit save shortcut.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveToLocalFile();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [saveToLocalFile]);

  // Save when the tab becomes hidden or the page is being closed.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        saveToLocalFile();
      }
    };

    const onPageHide = () => {
      saveToLocalFile();
    };

    const onBeforeUnload = () => {
      saveToLocalFile();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [saveToLocalFile]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#111111', overflow: 'hidden' }}>
      <Toolbar />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <WallCanvas />
        </div>
        {aiPanelOpen && <FileAnalysisPanel />}
      </div>
      <ExportModal />
      <ImportModal />
      <CustomUrlModal />
      <EdgeStyleModal />
      <ApiSettingsModal />
      <CombineModal />
      <ImportDataModal />
    </div>
  );
};

export default App;
