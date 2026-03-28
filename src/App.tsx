import React, { useEffect } from 'react';
import { WallCanvas } from './components/WallCanvas';
import { Toolbar } from './components/Toolbar';
import { ExportModal } from './components/modals/ExportModal';
import { ImportModal } from './components/modals/ImportModal';
import { CustomUrlModal } from './components/modals/CustomUrlModal';
import { EdgeStyleModal } from './components/modals/EdgeStyleModal';
import { ApiSettingsModal } from './components/modals/ApiSettingsModal';
import { FileAnalysisPanel } from './components/FileAnalysisPanel';
import { useWorkspaceStore } from './store/useWorkspaceStore';
import { clearAllLocalData } from './utils/fileSystem';

const App: React.FC = () => {
  const aiPanelOpen = useWorkspaceStore(s => s.aiPanelOpen);

  useEffect(() => { clearAllLocalData(); }, []);

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
    </div>
  );
};

export default App;
