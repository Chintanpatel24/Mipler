import React, { useState, useRef, useCallback } from 'react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { analyzeFilesWithAi, generatePredictions, readFileForAnalysis } from '../../utils/aiApi';
import { spawnMindmapOnCanvas } from '../../store/useWorkspaceStore';
import type { UploadedFile, MindmapResult, PredictionData } from '../../types';

function fileBadge(type: string): string {
  if (type === 'json') return 'JSON';
  if (type === 'pdf') return 'PDF';
  if (type === 'image') return 'IMG';
  if (type === 'csv') return 'CSV';
  if (['txt', 'md', 'log'].includes(type)) return 'TXT';
  if (['xml', 'html', 'yaml', 'yml'].includes(type)) return type.toUpperCase();
  return 'FILE';
}

export const ImportDataModal: React.FC = () => {
  const {
    importDataModalOpen, setImportDataModalOpen,
    llmBaseUrl, llmModel,
    addCard, importedFiles, setImportedFiles,
    importQuestion, setImportQuestion,
  } = useWorkspaceStore();

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState<MindmapResult | null>(null);
  const [predictions, setPredictions] = useState<PredictionData | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [spawned, setSpawned] = useState(false);
  const [analyzePredictions, setAnalyzePredictions] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(async (incoming: FileList | null) => {
    if (!incoming) return;
    setError('');
    setResult(null);
    setSpawned(false);
    const added: UploadedFile[] = [];
    for (const file of Array.from(incoming)) {
      try {
        added.push(await readFileForAnalysis(file));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    setImportedFiles([...importedFiles, ...added]);
  }, [importedFiles, setImportedFiles]);

  const removeFile = (id: string) => {
    setImportedFiles(importedFiles.filter(f => f.id !== id));
    setResult(null);
    setSpawned(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const analyze = async () => {
    if (!importQuestion.trim()) { setError('Please write a question first.'); return; }
    if (importedFiles.length === 0) { setError('Please upload at least one file.'); return; }
    setError('');
    setLoading(true);
    setSpawned(false);
    setResult(null);
    setPredictions(null);

    try {
      setLoadingStep('Sending files to Ollama...');
      const analysisFiles = importedFiles.map(f => ({ name: f.name, type: f.type, data: f.data }));
      setLoadingStep('AI is reading evidence and tracing leads...');
      const res = await analyzeFilesWithAi(importQuestion, analysisFiles, llmBaseUrl, llmModel);
      setLoadingStep('Structuring the investigation map...');
      setResult(res);

      if (analyzePredictions) {
        setLoadingStep('Generating predictions...');
        const predRes = await generatePredictions(importQuestion, res.answer, llmBaseUrl, llmModel);
        setPredictions(predRes);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
    setLoadingStep('');
  };

  const spawnOnCanvas = () => {
    if (!result) return;
    spawnMindmapOnCanvas(result);

    // Also spawn prediction card if available
    if (predictions) {
      const nodes = useWorkspaceStore.getState().nodes;
      const maxY = nodes.reduce((m, n) => Math.max(m, n.position.y + 200), 0);
      addCard('prediction', { x: 400, y: maxY + 100 }, {
        title: 'Prediction: ' + predictions.action.slice(0, 50),
        content: `Action: ${predictions.action}\n\nPredictions:\n${predictions.predictions.map(p => `• ${p}`).join('\n')}\n\nConfidence: ${(predictions.confidence * 100).toFixed(0)}%\n\nRisks:\n${predictions.risks.map(r => `⚠ ${r}`).join('\n')}`,
        cardColor: '#2a1a3a',
        predictionData: predictions,
      });
    }

    setSpawned(true);
  };

  if (!importDataModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="animate-fade-in" style={{
        width: 520, maxHeight: '85vh', background: '#1a1a1a', border: '1px solid #2a2a2a',
        borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
        fontFamily: 'IBM Plex Sans, sans-serif', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid #222', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>Import Data & Analyze</span>
            <span style={{
              fontSize: 8, padding: '1px 5px', background: '#0a1a0a',
              color: '#3a8a3a', border: '1px solid #1a3a1a', borderRadius: 3,
              fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em',
            }}>OLLAMA</span>
          </div>
          <button onClick={() => { setImportDataModalOpen(false); setError(''); setResult(null); setSpawned(false); setPredictions(null); }}
            style={{ padding: '3px 6px', color: '#444', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 3 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ccc')}
            onMouseLeave={e => (e.currentTarget.style.color = '#444')}>
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="8" y2="8" /><line x1="8" y1="1" x2="1" y2="8" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#3b82f6' : importedFiles.length > 0 ? '#2a4a2a' : '#252525'}`,
              borderRadius: 8, padding: '14px 12px',
              textAlign: 'center', cursor: 'pointer',
              background: dragging ? '#0a1220' : importedFiles.length > 0 ? '#0a140a' : '#0f0f0f',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 4, opacity: 0.4 }}>&#128193;</div>
            <p style={{ fontSize: 11, color: importedFiles.length > 0 ? '#4a8a4a' : '#444', marginBottom: 3 }}>
              {importedFiles.length > 0 ? `${importedFiles.length} file${importedFiles.length > 1 ? 's' : ''} loaded — drop more or click` : 'Drop files here or click to browse'}
            </p>
            <p style={{ fontSize: 9, color: '#333', fontFamily: 'IBM Plex Mono' }}>
              JSON · CSV · TXT · PDF · images · XML · YAML · any file
            </p>
            <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
          </div>

          {/* Files list */}
          {importedFiles.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <p style={{ fontSize: 9, color: '#555', fontFamily: 'IBM Plex Mono', letterSpacing: '0.07em' }}>UPLOADED FILES</p>
                <button onClick={() => { setImportedFiles([]); setResult(null); setSpawned(false); }}
                  style={{ fontSize: 9, color: '#444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'IBM Plex Mono' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#444')}>
                  clear all
                </button>
              </div>
              {importedFiles.map(f => (
                <div key={f.id} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '5px 8px', background: '#181818',
                  border: '1px solid #202020', borderRadius: 5, marginBottom: 4,
                }}>
                  <span style={{ fontSize: 8, padding: '1px 4px', background: '#222', color: '#666', borderRadius: 3, fontFamily: 'IBM Plex Mono', flexShrink: 0 }}>
                    {fileBadge(f.type)}
                  </span>
                  <span style={{ flex: 1, fontSize: 11, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <span style={{ fontSize: 9, color: '#383838', fontFamily: 'IBM Plex Mono', flexShrink: 0 }}>{(f.size / 1024).toFixed(1)}k</span>
                  <button onClick={() => removeFile(f.id)}
                    style={{ padding: '2px 3px', color: '#383838', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 3, flexShrink: 0, lineHeight: 1 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#383838')}>
                    &#10005;
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Question input */}
          <div>
            <p style={{ fontSize: 9, color: '#555', marginBottom: 6, fontFamily: 'IBM Plex Mono', letterSpacing: '0.07em' }}>
              YOUR QUESTION
            </p>
            <textarea
              value={importQuestion}
              onChange={e => { setImportQuestion(e.target.value); setResult(null); setSpawned(false); }}
              placeholder={importedFiles.length === 0 ? 'Upload files first, then write your question here...' : 'What do you want to know? e.g.:\n• "Summarise the key findings"\n• "Who are the main entities?"\n• "What security risks are present?"'}
              rows={3}
              style={{
                width: '100%', padding: '8px 10px', background: '#111',
                border: `1px solid ${importQuestion.trim() ? '#2a4a2a' : '#222'}`,
                borderRadius: 6, fontSize: 11, color: '#ccc', outline: 'none',
                fontFamily: 'IBM Plex Sans', resize: 'vertical',
                boxSizing: 'border-box' as const, lineHeight: 1.6,
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#2a4a6a')}
              onBlur={e => (e.currentTarget.style.borderColor = importQuestion.trim() ? '#2a4a2a' : '#222')}
            />
            {/* Quick question chips */}
            {importedFiles.length > 0 && !importQuestion.trim() && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {['Summarise the key findings', 'Who are the main entities?', 'What are the security risks?', 'What patterns do you see?'].map(q => (
                  <button key={q} onClick={() => setImportQuestion(q)}
                    style={{ padding: '3px 8px', background: '#181818', border: '1px solid #282828', borderRadius: 10, fontSize: 10, color: '#555', cursor: 'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#aaa'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#3a3a3a'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#555'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#282828'; }}>
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Prediction toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 10px', background: '#111', border: '1px solid #222', borderRadius: 5,
          }}>
            <div>
              <span style={{ fontSize: 11, color: '#aaa', fontFamily: 'IBM Plex Sans' }}>Include Predictions</span>
              <span style={{ fontSize: 9, color: '#444', display: 'block', marginTop: 1, fontFamily: 'IBM Plex Mono' }}>
                AI will predict outcomes of actions
              </span>
            </div>
            <button onClick={() => setAnalyzePredictions(!analyzePredictions)}
              style={{
                width: 36, height: 20, borderRadius: 10,
                background: analyzePredictions ? '#2a1a3a' : '#222',
                border: `1px solid ${analyzePredictions ? '#5a3a8a' : '#333'}`,
                cursor: 'pointer', position: 'relative', transition: 'all 0.15s',
              }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                background: analyzePredictions ? '#8b5cf6' : '#555',
                position: 'absolute', top: 2,
                left: analyzePredictions ? 18 : 3,
                transition: 'all 0.15s',
              }} />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '8px 10px', background: '#1e0a0a', border: '1px solid #4a1a1a', borderRadius: 5, fontSize: 11, color: '#cc5555', lineHeight: 1.5 }}>
              &#9888; {error}
            </div>
          )}

          {/* Loading */}
          {loadingStep && !error && (
            <div style={{ padding: '7px 10px', background: '#0a1520', border: '1px solid #1a3a5a', borderRadius: 5, fontSize: 11, color: '#4a8abf', fontFamily: 'IBM Plex Mono' }}>
              {loadingStep}
            </div>
          )}

          {/* Analyze button */}
          <button
            onClick={analyze}
            disabled={loading || !importQuestion.trim() || importedFiles.length === 0}
            style={{
              padding: '10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              cursor: (loading || !importQuestion.trim() || importedFiles.length === 0) ? 'default' : 'pointer',
              background: loading ? '#111' : (!importQuestion.trim() || importedFiles.length === 0) ? '#111' : '#0a2540',
              border: `1px solid ${loading ? '#1e1e1e' : (!importQuestion.trim() || importedFiles.length === 0) ? '#1e1e1e' : '#1a4a7a'}`,
              color: loading ? '#333' : (!importQuestion.trim() || importedFiles.length === 0) ? '#333' : '#5ab0f0',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading
              ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>&#10227;</span> {loadingStep || 'Analysing...'}</>
              : '&#9889; Analyze & Generate Mindmap'}
          </button>

          {/* Results */}
          {result && (
            <>
              <div style={{
                display: 'flex', gap: 8, padding: '6px 10px',
                background: '#0a1a0a', border: '1px solid #1a3a1a', borderRadius: 5,
              }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#4a9a5a', fontFamily: 'IBM Plex Mono' }}>{result.mindmap.nodes.length}</div>
                  <div style={{ fontSize: 8, color: '#3a5a3a', fontFamily: 'IBM Plex Mono', letterSpacing: '0.07em' }}>TOPICS</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#4a9a5a', fontFamily: 'IBM Plex Mono' }}>{result.answer.split(/\s+/).length}</div>
                  <div style={{ fontSize: 8, color: '#3a5a3a', fontFamily: 'IBM Plex Mono', letterSpacing: '0.07em' }}>WORDS</div>
                </div>
                {predictions && (
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#8b5cf6', fontFamily: 'IBM Plex Mono' }}>{(predictions.confidence * 100).toFixed(0)}%</div>
                    <div style={{ fontSize: 8, color: '#5a3a8a', fontFamily: 'IBM Plex Mono', letterSpacing: '0.07em' }}>CONFIDENCE</div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={spawnOnCanvas} disabled={spawned}
                  style={{
                    flex: 2, padding: '9px 6px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    cursor: spawned ? 'default' : 'pointer',
                    background: spawned ? '#0a1a0a' : '#0a2a1a',
                    border: `1px solid ${spawned ? '#1a3a1a' : '#2a6a3a'}`,
                    color: spawned ? '#3a6a3a' : '#5acc7a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  {spawned ? 'Cards placed on canvas' : 'Place Mindmap on Canvas'}
                </button>
              </div>

              <div>
                <p style={{ fontSize: 9, color: '#555', marginBottom: 6, fontFamily: 'IBM Plex Mono', letterSpacing: '0.07em' }}>AI ANSWER</p>
                <div style={{
                  padding: '10px 12px', background: '#111', border: '1px solid #1e1e1e',
                  borderRadius: 6, fontSize: 11, color: '#c0c0c0', lineHeight: 1.7,
                  whiteSpace: 'pre-wrap', maxHeight: 120, overflowY: 'auto',
                }}>
                  {result.answer}
                </div>
              </div>

              {predictions && (
                <div>
                  <p style={{ fontSize: 9, color: '#555', marginBottom: 6, fontFamily: 'IBM Plex Mono', letterSpacing: '0.07em' }}>PREDICTIONS</p>
                  <div style={{
                    padding: '10px 12px', background: '#110a1a', border: '1px solid #2a1a3a',
                    borderRadius: 6, fontSize: 11, color: '#c0b0d0', lineHeight: 1.7,
                  }}>
                    <p style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: 6 }}>{predictions.action}</p>
                    {predictions.predictions.map((p, i) => (
                      <p key={i} style={{ marginBottom: 3 }}>&#8226; {p}</p>
                    ))}
                    {predictions.risks.length > 0 && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #2a1a3a' }}>
                        <p style={{ color: '#f97316', fontSize: 9, fontFamily: 'IBM Plex Mono', marginBottom: 4 }}>RISKS</p>
                        {predictions.risks.map((r, i) => (
                          <p key={i} style={{ color: '#d09060', fontSize: 10 }}>&#9888; {r}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
