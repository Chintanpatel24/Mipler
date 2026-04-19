import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { apiService, type AssistantLLMSettings } from '../../services/api';

export const ApiSettingsModal: React.FC = () => {
  const { apiSettingsOpen, setApiSettingsOpen, llmBaseUrl, setLlmBaseUrl, llmModel, setLlmModel } = useWorkspaceStore();
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [provider, setProvider] = useState<AssistantLLMSettings['provider']>('ollama');
  const [model, setModel] = useState('qwen2.5:0.5b');
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434');
  const [apiKey, setApiKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (!apiSettingsOpen) return;
    let cancelled = false;

    const load = async () => {
      try {
        const settings = await apiService.getAssistantLLMSettings();
        if (cancelled) return;
        setProvider(settings.provider);
        setModel(settings.model || llmModel);
        setBaseUrl(settings.base_url || llmBaseUrl);
        setHasStoredKey(settings.has_api_key);
        setApiKey('');
      } catch {
        if (cancelled) return;
        setProvider('ollama');
        setModel(llmModel || 'qwen2.5:0.5b');
        setBaseUrl(llmBaseUrl || 'http://localhost:11434');
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [apiSettingsOpen, llmBaseUrl, llmModel]);

  const testConnection = async () => {
    setTestStatus('testing');
    try {
      const url = (baseUrl || 'http://localhost:11434').trim();
      const res = await fetch(url + '/api/tags');
      if (res.ok) setTestStatus('ok');
      else setTestStatus('fail');
    } catch {
      setTestStatus('fail');
    }
  };

  const saveSettings = async () => {
    setSaveStatus('Saving...');
    try {
      await apiService.setAssistantLLMSettings({
        provider,
        model,
        base_url: baseUrl,
        api_key: apiKey,
      });

      if (provider === 'ollama') {
        setLlmBaseUrl(baseUrl);
        setLlmModel(model);
      }

      setApiKey('');
      setHasStoredKey(true);
      setSaveStatus('Saved securely in backend storage');
      setTimeout(() => setSaveStatus(''), 2500);
    } catch (error: unknown) {
      setSaveStatus(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Modal open={apiSettingsOpen} onClose={() => setApiSettingsOpen(false)} title="Assistant Model Settings">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ background: '#101820', border: '1px solid #1f3246', borderRadius: 6, padding: '10px 12px' }}>
          <p style={{ fontSize: 10, color: '#7ab3e8', fontFamily: 'IBM Plex Mono', marginBottom: 6 }}>MULTI-PROVIDER ROUTING</p>
          <p style={{ fontSize: 11, color: '#8aa6bc', fontFamily: 'IBM Plex Mono', lineHeight: 1.7 }}>
            Provider keys are encrypted and stored in backend local storage.<br />
            They are not exported with workspace JSON.
          </p>
        </div>

        <div>
          <p style={{ fontSize: 10, color: '#555', marginBottom: 6, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em' }}>PROVIDER</p>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AssistantLLMSettings['provider'])}
            style={{ width: '100%', padding: '7px 10px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 5, fontSize: 12, color: '#ccc', outline: 'none', fontFamily: 'IBM Plex Mono', boxSizing: 'border-box' as const }}
          >
            <option value="ollama">Ollama</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>

        <div>
          <p style={{ fontSize: 10, color: '#555', marginBottom: 6, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em' }}>BASE URL</p>
          <input
            type="text"
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            placeholder={provider === 'ollama' ? 'http://localhost:11434' : 'Optional provider base URL'}
            style={{ width: '100%', padding: '7px 10px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 5, fontSize: 12, color: '#ccc', outline: 'none', fontFamily: 'IBM Plex Mono', boxSizing: 'border-box' as const }}
            onFocus={e => (e.currentTarget.style.borderColor = '#3a3a3a')}
            onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
          />
        </div>

        <div>
          <p style={{ fontSize: 10, color: '#555', marginBottom: 6, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em' }}>MODEL</p>
          <input
            type="text"
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder="qwen2.5:0.5b"
            style={{ width: '100%', padding: '7px 10px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 5, fontSize: 12, color: '#ccc', outline: 'none', fontFamily: 'IBM Plex Mono', boxSizing: 'border-box' as const }}
            onFocus={e => (e.currentTarget.style.borderColor = '#3a3a3a')}
            onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
          />
          <p style={{ fontSize: 10, color: '#444', marginTop: 4, fontFamily: 'IBM Plex Sans' }}>
            Use local or cloud model IDs, for example gpt-4o-mini, claude-3-5-sonnet-latest, or openrouter model names.
          </p>
        </div>

        {provider !== 'ollama' && (
          <div>
            <p style={{ fontSize: 10, color: '#555', marginBottom: 6, fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em' }}>
              API KEY {hasStoredKey ? '(key already stored)' : ''}
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={hasStoredKey ? 'Leave empty to keep existing key' : 'Paste API key'}
              style={{ width: '100%', padding: '7px 10px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 5, fontSize: 12, color: '#ccc', outline: 'none', fontFamily: 'IBM Plex Mono', boxSizing: 'border-box' as const }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={provider === 'ollama' ? testConnection : saveSettings}
            disabled={testStatus === 'testing'}
            style={{
              flex: 1, padding: '8px', background: '#1a2a1a', border: '1px solid #2a3a2a',
              borderRadius: 5, fontSize: 12, color: '#6a9a6a', cursor: 'pointer', fontFamily: 'IBM Plex Sans',
            }}
          >
            {provider === 'ollama'
              ? (testStatus === 'testing' ? 'Testing...' : testStatus === 'ok' ? '✓ Connected' : testStatus === 'fail' ? '✗ Failed' : 'Test Ollama')
              : 'Save Provider'}
          </button>
          <button
            onClick={saveSettings}
            style={{ flex: 1, padding: '8px', background: '#2a2a2a', border: 'none', borderRadius: 5, fontSize: 12, color: '#ccc', cursor: 'pointer', fontFamily: 'IBM Plex Sans' }}
          >
            Save
          </button>
        </div>

        {saveStatus && (
          <p style={{ fontSize: 11, color: saveStatus.startsWith('Saved') ? '#7bd996' : '#ef9a9a', fontFamily: 'IBM Plex Sans' }}>
            {saveStatus}
          </p>
        )}

        <button
          onClick={() => setApiSettingsOpen(false)}
          style={{ padding: '8px', background: '#111', border: '1px solid #2a2a2a', borderRadius: 5, fontSize: 12, color: '#888', cursor: 'pointer', fontFamily: 'IBM Plex Sans' }}
        >
          Close
        </button>
      </div>
    </Modal>
  );
};
