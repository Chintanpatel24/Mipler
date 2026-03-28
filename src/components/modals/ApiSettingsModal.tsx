import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

export const ApiSettingsModal: React.FC = () => {
  const { apiSettingsOpen, setApiSettingsOpen, llmBaseUrl, setLlmBaseUrl, llmModel, setLlmModel } = useWorkspaceStore();
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');

  const testConnection = async () => {
    setTestStatus('testing');
    try {
      const res = await fetch((llmBaseUrl || 'http://localhost:11434') + '/api/tags');
      if (res.ok) setTestStatus('ok');
      else setTestStatus('fail');
    } catch {
      setTestStatus('fail');
    }
  };

  return (
    <Modal open={apiSettingsOpen} onClose={() => setApiSettingsOpen(false)} title="Ollama Settings">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ background: '#0f1a0f', border: '1px solid #1a3a1a', borderRadius: 6, padding: '10px 12px' }}>
          <p style={{ fontSize: 10, color: '#3a6a3a', fontFamily: 'IBM Plex Mono', marginBottom: 6 }}>OLLAMA QUICK START</p>
          <p style={{ fontSize: 11, color: '#2a5a2a', fontFamily: 'IBM Plex Mono', lineHeight: 1.7 }}>
            ollama serve<br />
            ollama pull llama3<br />
            <span style={{ color: '#1a4a1a' }}>OLLAMA_ORIGINS=* ollama serve  # for CORS</span>
          </p>
        </div>

        <div>
          <p style={{ fontSize: 10, color: '#555', marginBottom: 6, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em' }}>OLLAMA BASE URL</p>
          <input
            type="text"
            value={llmBaseUrl}
            onChange={e => setLlmBaseUrl(e.target.value)}
            placeholder="http://localhost:11434"
            style={{ width: '100%', padding: '7px 10px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 5, fontSize: 12, color: '#ccc', outline: 'none', fontFamily: 'IBM Plex Mono', boxSizing: 'border-box' as const }}
            onFocus={e => (e.currentTarget.style.borderColor = '#3a3a3a')}
            onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
          />
        </div>

        <div>
          <p style={{ fontSize: 10, color: '#555', marginBottom: 6, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em' }}>MODEL</p>
          <input
            type="text"
            value={llmModel}
            onChange={e => setLlmModel(e.target.value)}
            placeholder="llama3"
            style={{ width: '100%', padding: '7px 10px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 5, fontSize: 12, color: '#ccc', outline: 'none', fontFamily: 'IBM Plex Mono', boxSizing: 'border-box' as const }}
            onFocus={e => (e.currentTarget.style.borderColor = '#3a3a3a')}
            onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
          />
          <p style={{ fontSize: 10, color: '#444', marginTop: 4, fontFamily: 'IBM Plex Sans' }}>
            Common models: llama3, mistral, gemma2, phi3, qwen2
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={testConnection}
            disabled={testStatus === 'testing'}
            style={{
              flex: 1, padding: '8px', background: '#1a2a1a', border: '1px solid #2a3a2a',
              borderRadius: 5, fontSize: 12, color: '#6a9a6a', cursor: 'pointer', fontFamily: 'IBM Plex Sans',
            }}
          >
            {testStatus === 'testing' ? 'Testing...' : testStatus === 'ok' ? '✓ Connected' : testStatus === 'fail' ? '✗ Failed' : 'Test Connection'}
          </button>
          <button
            onClick={() => setApiSettingsOpen(false)}
            style={{ flex: 1, padding: '8px', background: '#2a2a2a', border: 'none', borderRadius: 5, fontSize: 12, color: '#ccc', cursor: 'pointer', fontFamily: 'IBM Plex Sans' }}
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
