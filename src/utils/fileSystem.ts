import type { WorkspaceState } from '../types';

export function hasFileSystemAccess(): boolean {
  return 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
}

export async function saveWithFileSystemAccess(state: WorkspaceState): Promise<void> {
  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: 'mipler-workspace.json',
      types: [{ description: 'Mipler Workspace', accept: { 'application/json': ['.json'] } }],
    });
    const w = await handle.createWritable();
    await w.write(JSON.stringify(state, null, 2));
    await w.close();
  } catch (e: any) {
    if (e.name !== 'AbortError') throw e;
  }
}

export async function loadWithFileSystemAccess(): Promise<WorkspaceState | null> {
  try {
    const [handle] = await (window as any).showOpenFilePicker({
      types: [{ description: 'Mipler Workspace', accept: { 'application/json': ['.json'] } }],
    });
    const file = await handle.getFile();
    return JSON.parse(await file.text()) as WorkspaceState;
  } catch (e: any) {
    if (e.name !== 'AbortError') throw e;
    return null;
  }
}

export function downloadWorkspace(state: WorkspaceState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mipler-workspace.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Upload any JSON file — accepts:
 *  1. A full Mipler workspace export  (has `investigations` or `nodes`)
 *  2. A Mipler mindmap export         (has `answer` + `mindmap`)
 *  3. Any arbitrary JSON              (wrapped as raw data for inspection)
 *
 * Returns { type, data } so the caller can decide how to handle it.
 */
export type ImportedFile =
  | { type: 'workspace'; data: WorkspaceState }
  | { type: 'mindmap'; data: MindmapImport }
  | { type: 'raw'; data: unknown; filename: string };

export interface MindmapImport {
  answer: string;
  mindmap: {
    root: string;
    nodes: MindmapNode[];
  };
}

export interface MindmapNode {
  id: string;
  label: string;
  children: MindmapNode[];
}

export function uploadJsonFile(): Promise<ImportedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      let parsed: any;
      try {
        parsed = JSON.parse(await f.text());
      } catch {
        throw new Error(`"${f.name}" is not valid JSON — please check the file.`);
      }

      // Detect mindmap export
      if (parsed && typeof parsed === 'object' && parsed.answer !== undefined && parsed.mindmap?.root) {
        return resolve({ type: 'mindmap', data: parsed as MindmapImport });
      }

      // Detect workspace export (has investigations array or nodes array)
      if (
        parsed &&
        typeof parsed === 'object' &&
        (Array.isArray(parsed.investigations) || Array.isArray(parsed.nodes))
      ) {
        return resolve({ type: 'workspace', data: parsed as WorkspaceState });
      }

      // Fallback — raw JSON for inspection
      return resolve({ type: 'raw', data: parsed, filename: f.name });
    };
    input.click();
  });
}

/** Legacy shim used by ImportModal */
export function uploadWorkspace(): Promise<WorkspaceState | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      try {
        const parsed = JSON.parse(await f.text());
        resolve(parsed as WorkspaceState);
      } catch {
        reject(new Error(`"${f.name}" is not valid JSON — please check the file and try again.`));
      }
    };
    input.click();
  });
}

export function clearAllLocalData(): void {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
}
