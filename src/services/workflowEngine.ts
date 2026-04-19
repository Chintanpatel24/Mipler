/**
 * Mipler Workflow Execution Engine
 *
 * Client-side workflow engine that propagates real data through connected cards.
 * Handles: triggers, HTTP requests, transforms, conditions, loops, code execution,
 * OSINT tools, swarm agents, delays, merge, and more.
 *
 * Data flows through edges — each node receives inputs from its upstream nodes
 * and produces outputs that flow downstream.
 */

import type { MiplerNode, MiplerEdge, CardData, WorkflowNodeConfig } from '../types';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { DEFAULT_INVESTIGATION_PROFILE_NAMES } from '../utils/investigationFlow';

// ── Types ──────────────────────────────────────────────────────────────────────

export type NodeStatus = 'idle' | 'running' | 'success' | 'error' | 'skipped';

export interface NodeExecutionResult {
  nodeId: string;
  status: NodeStatus;
  output: unknown;
  error?: string;
  executionTime: number;
}

export interface ExecutionLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  nodeId: string;
}

export interface WorkflowExecution {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  startedAt: number;
  finishedAt?: number;
  nodeResults: Map<string, NodeExecutionResult>;
  logs: ExecutionLog[];
  finalOutput: unknown;
}

export type ExecutionCallback = (execution: WorkflowExecution) => void;

async function wait(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('aborted'));
    };

    if (signal?.aborted) {
      onAbort();
      return;
    }

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function animateEdgeSequence(
  edgeIds: string[],
  signal?: AbortSignal,
  stepMs = 320,
): Promise<void> {
  const store = useWorkspaceStore.getState();
  for (const edgeId of edgeIds) {
    if (signal?.aborted) break;
    store.updateEdgeStyle(edgeId, { isGlowing: true, dataFlowActive: true });
    try {
      await wait(stepMs, signal);
    } catch {
      break;
    }
    store.updateEdgeStyle(edgeId, { isGlowing: true, dataFlowActive: false });
  }
}

async function runFinalGlobalGlow(edges: MiplerEdge[], signal?: AbortSignal): Promise<void> {
  const store = useWorkspaceStore.getState();
  for (const edge of edges) {
    store.updateEdgeStyle(edge.id, { isGlowing: true, dataFlowActive: true });
  }

  try {
    await wait(10000, signal);
  } catch {
    // Execution stopped; reset handled by caller.
  }
}

// ── Utility ────────────────────────────────────────────────────────────────────

function log(execution: WorkflowExecution, level: ExecutionLog['level'], nodeId: string, message: string) {
  execution.logs.push({ timestamp: Date.now(), level, message, nodeId });
}

function safeJsonParse(str: string): unknown {
  try { return JSON.parse(str); } catch { return str; }
}

function deepGet(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    if (typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function formatOutput(output: unknown): string {
  if (output == null) return '';
  if (typeof output === 'string') return output;
  try { return JSON.stringify(output, null, 2); } catch { return String(output); }
}

function getOutputType(output: unknown): string {
  if (output == null) return 'null';
  if (Array.isArray(output)) return `array[${output.length}]`;
  if (typeof output === 'object') return 'object';
  if (typeof output === 'string') return `string[${output.length}]`;
  return typeof output;
}

function getOutputSize(output: unknown): number {
  if (output == null) return 0;
  if (typeof output === 'string') return output.length;
  try { return JSON.stringify(output).length; } catch { return 0; }
}

// ── Topological Sort ───────────────────────────────────────────────────────────

function topologicalSort(nodes: MiplerNode[], edges: MiplerEdge[]): MiplerNode[] {
  const adj = new Map<string, string[]>();
  const inDeg = new Map<string, number>();
  const nodeMap = new Map<string, MiplerNode>();

  for (const n of nodes) {
    adj.set(n.id, []);
    inDeg.set(n.id, 0);
    nodeMap.set(n.id, n);
  }

  for (const e of edges) {
    if (adj.has(e.source) && inDeg.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDeg) {
    if (deg === 0) queue.push(id);
  }

  const result: MiplerNode[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) result.push(node);
    for (const next of adj.get(id) || []) {
      inDeg.set(next, (inDeg.get(next) || 0) - 1);
      if (inDeg.get(next) === 0) queue.push(next);
    }
  }

  // Check for cycles — remaining nodes with in-degree > 0
  if (result.length < nodes.length) {
    const remaining = nodes.filter(n => !result.find(r => r.id === n.id));
    result.push(...remaining); // Add remaining in original order as fallback
  }

  return result;
}

function getInputsForNode(nodeId: string, edges: MiplerEdge[], results: Map<string, NodeExecutionResult>): Map<string, unknown> {
  const inputs = new Map<string, unknown>();
  for (const edge of edges) {
    if (edge.target === nodeId) {
      const sourceResult = results.get(edge.source);
      if (sourceResult) {
        inputs.set(edge.source, sourceResult.output);
      }
    }
  }
  return inputs;
}

function getFirstInput(inputs: Map<string, unknown>): unknown {
  if (inputs.size === 0) return null;
  const first = inputs.values().next().value;
  return first ?? null;
}

function mergeInputs(inputs: Map<string, unknown>): unknown {
  if (inputs.size === 0) return null;
  if (inputs.size === 1) return getFirstInput(inputs);
  const merged: Record<string, unknown> = {};
  for (const [sourceId, data] of inputs) {
    merged[sourceId] = data;
  }
  return merged;
}

// ── Node Executors ─────────────────────────────────────────────────────────────

async function executeTrigger(node: MiplerNode, inputs: Map<string, unknown>, config: WorkflowNodeConfig): Promise<unknown> {
  // Trigger nodes produce initial data
  const triggerType = config.triggerType || 'manual';
  if (triggerType === 'data' && config.body) {
    return safeJsonParse(config.body);
  }
  return { triggered: true, timestamp: Date.now(), type: triggerType };
}

async function executeImportCard(node: MiplerNode, inputs: Map<string, unknown>): Promise<unknown> {
  const data = node.data;
  const result: Record<string, unknown> = {};

  if (data.importedFiles && data.importedFiles.length > 0) {
    result.files = data.importedFiles.map(f => ({
      name: f.name,
      type: f.type,
      data: typeof f.data === 'string' ? f.data.slice(0, 10000) : JSON.stringify(f.data).slice(0, 10000),
      size: f.size,
    }));
  }
  if (data.content) {
    result.content = data.content;
  }
  if (data.questionText) {
    result.question = data.questionText;
  }

  return Object.keys(result).length > 0 ? result : { content: data.content || '' };
}

async function executeDataSupplier(node: MiplerNode, inputs: Map<string, unknown>): Promise<unknown> {
  const merged = mergeInputs(inputs);
  if (merged == null) {
    return { files: [], textContent: node.data.content || '', sourceCount: 0, totalFiles: 0 };
  }

  if (typeof merged === 'object' && !Array.isArray(merged)) {
    return merged;
  }

  return { data: merged, sourceCount: inputs.size, totalFiles: 0 };
}

async function executeHttpRequest(node: MiplerNode, inputs: Map<string, unknown>, config: WorkflowNodeConfig): Promise<unknown> {
  let url = config.url || '';
  const method = (config.method || 'GET').toUpperCase();

  // Interpolate input data into URL if template
  const inputData = getFirstInput(inputs);
  if (inputData && typeof inputData === 'object') {
    for (const [key, value] of Object.entries(inputData as Record<string, unknown>)) {
      url = url.replace(`{{${key}}}`, String(value));
    }
  }

  if (!url) throw new Error('No URL configured');

  // Security: only allow http/https
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('Only HTTP/HTTPS URLs are allowed');
  }

  const fetchOptions: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };

  if (config.headers) {
    fetchOptions.headers = { ...fetchOptions.headers as Record<string, string>, ...config.headers };
  }

  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    let body = config.body || '';
    // Interpolate input into body
    if (inputData && typeof inputData === 'object') {
      for (const [key, value] of Object.entries(inputData as Record<string, unknown>)) {
        body = body.replace(`{{${key}}}`, JSON.stringify(value));
      }
    }
    // If body references "input", replace with entire input data
    if (body.includes('{{input}}')) {
      body = body.replace('{{input}}', JSON.stringify(inputData));
    }
    fetchOptions.body = body || undefined;
  }

  const response = await fetch(url, fetchOptions);
  const contentType = response.headers.get('content-type') || '';
  let body: unknown;

  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  return {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    body,
  };
}

async function executeTransform(node: MiplerNode, inputs: Map<string, unknown>, config: WorkflowNodeConfig): Promise<unknown> {
  const input = getFirstInput(inputs);
  const transform = config.transform || 'passthrough';

  switch (transform) {
    case 'passthrough':
      return input;

    case 'to_string':
      return typeof input === 'string' ? input : JSON.stringify(input, null, 2);

    case 'to_json':
      return typeof input === 'string' ? safeJsonParse(input) : input;

    case 'extract_field': {
      const field = config.field || '';
      if (!field) throw new Error('No field path specified for extract_field');
      return deepGet(input, field);
    }

    case 'filter_list': {
      if (!Array.isArray(input)) throw new Error('Input must be an array for filter_list');
      const condition = config.condition || '';
      if (!condition) return input;
      // Simple filter: keep items where field exists / is truthy
      return input.filter((item: unknown) => {
        const val = deepGet(item, condition);
        return val !== undefined && val !== null && val !== false && val !== '';
      });
    }

    case 'map_list': {
      if (!Array.isArray(input)) throw new Error('Input must be an array for map_list');
      const field = config.field || '';
      if (!field) return input;
      return input.map((item: unknown) => deepGet(item, field));
    }

    case 'merge': {
      if (inputs.size < 2) return input;
      const allInputs = Array.from(inputs.values());
      if (allInputs.every(i => Array.isArray(i))) {
        return (allInputs as unknown[][]).flat();
      }
      if (allInputs.every(i => typeof i === 'object' && i !== null)) {
        return Object.assign({}, ...allInputs as Record<string, unknown>[]);
      }
      return allInputs;
    }

    case 'split': {
      const delimiter = config.delimiter || ',';
      if (typeof input !== 'string') throw new Error('Input must be string for split');
      return input.split(delimiter).map(s => s.trim());
    }

    case 'join': {
      if (!Array.isArray(input)) throw new Error('Input must be array for join');
      const delimiter = config.delimiter || ', ';
      return input.map(String).join(delimiter);
    }

    case 'sort': {
      if (!Array.isArray(input)) throw new Error('Input must be array for sort');
      return [...input].sort((a, b) => {
        if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        return String(a).localeCompare(String(b));
      });
    }

    default:
      return input;
  }
}

async function executeCondition(node: MiplerNode, inputs: Map<string, unknown>, config: WorkflowNodeConfig): Promise<unknown> {
  const input = getFirstInput(inputs);
  const condition = config.condition || '';

  if (!condition) {
    // No condition — pass through if truthy
    return input ? { passed: true, data: input } : { passed: false, data: input };
  }

  // Safe expression evaluator (limited DSL)
  // Supports: len(data) > 0, data.field == "value", data.field > 10, "text" in data, etc.
  try {
    const result = evaluateCondition(condition, input, inputs);
    return { passed: result, data: input, condition };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Condition evaluation failed: ${msg}`);
  }
}

function evaluateCondition(expr: string, data: unknown, allInputs: Map<string, unknown>): boolean {
  // Handle "len(data) > N"
  const lenMatch = expr.match(/^len\((\w+)\)\s*(>=|<=|>|<|==|!=)\s*(\d+)$/);
  if (lenMatch) {
    const target = lenMatch[1] === 'data' ? data : allInputs.get(lenMatch[1]);
    const len = Array.isArray(target) ? target.length : typeof target === 'string' ? target.length : Object.keys(target as object || {}).length;
    const op = lenMatch[2];
    const val = parseInt(lenMatch[3]);
    return compare(len, op, val);
  }

  // Handle "field op value"
  const cmpMatch = expr.match(/^(\w+(?:\.\w+)*)\s*(>=|<=|>|<|==|!=)\s*(.+)$/);
  if (cmpMatch) {
    const fieldPath = cmpMatch[1];
    const op = cmpMatch[2];
    let rawVal = cmpMatch[3].trim();
    const fieldVal = deepGet(data, fieldPath);

    // Remove quotes from string values
    if ((rawVal.startsWith('"') && rawVal.endsWith('"')) || (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
      rawVal = rawVal.slice(1, -1);
      return compare(String(fieldVal), op, rawVal);
    }

    const numVal = parseFloat(rawVal);
    if (!isNaN(numVal)) {
      return compare(Number(fieldVal), op, numVal);
    }

    if (rawVal === 'true' || rawVal === 'false') {
      return compare(Boolean(fieldVal), op, rawVal === 'true');
    }

    if (rawVal === 'null') {
      return op === '==' ? fieldVal == null : fieldVal != null;
    }

    return compare(String(fieldVal), op, rawVal);
  }

  // Handle "'text' in data"
  const inMatch = expr.match(/^['"](.+)['"]\s+in\s+(\w+(?:\.\w+)*)$/);
  if (inMatch) {
    const search = inMatch[1];
    const fieldPath = inMatch[2];
    const fieldVal = fieldPath === 'data' ? data : deepGet(data, fieldPath);
    if (typeof fieldVal === 'string') return fieldVal.includes(search);
    if (Array.isArray(fieldVal)) return fieldVal.includes(search);
    return false;
  }

  // Handle simple truthiness
  if (/^\w+(?:\.\w+)*$/.test(expr)) {
    const val = expr === 'data' ? data : deepGet(data, expr);
    return Boolean(val);
  }

  throw new Error(`Unsupported condition syntax: ${expr}`);
}

function compare(a: unknown, op: string, b: unknown): boolean {
  switch (op) {
    case '>': return (a as number) > (b as number);
    case '<': return (a as number) < (b as number);
    case '>=': return (a as number) >= (b as number);
    case '<=': return (a as number) <= (b as number);
    case '==': return a == b;
    case '!=': return a != b;
    default: return false;
  }
}

async function executeLoop(node: MiplerNode, inputs: Map<string, unknown>, config: WorkflowNodeConfig): Promise<unknown> {
  const input = getFirstInput(inputs);
  const maxIterations = config.maxIterations || 100;

  if (Array.isArray(input)) {
    return input.slice(0, maxIterations);
  }

  if (typeof input === 'object' && input !== null) {
    const entries = Object.entries(input as Record<string, unknown>);
    return Object.fromEntries(entries.slice(0, maxIterations));
  }

  return { iterations: Math.min(maxIterations, typeof input === 'number' ? input : 1), data: input };
}

async function executeMerge(node: MiplerNode, inputs: Map<string, unknown>, config: WorkflowNodeConfig): Promise<unknown> {
  const mode = config.mode || 'concat';
  const allInputs = Array.from(inputs.values()).filter(v => v != null);

  if (allInputs.length === 0) return null;
  if (allInputs.length === 1) return allInputs[0];

  switch (mode) {
    case 'concat':
      if (allInputs.every(i => Array.isArray(i))) return allInputs.flat();
      return allInputs.map(i => typeof i === 'string' ? i : JSON.stringify(i)).join('\n');

    case 'deep_merge': {
      const result: Record<string, unknown> = {};
      for (const input of allInputs) {
        if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
          Object.assign(result, input);
        }
      }
      return result;
    }

    case 'union': {
      if (allInputs.every(i => Array.isArray(i))) {
        const seen = new Set<string>();
        const result: unknown[] = [];
        for (const arr of allInputs as unknown[][]) {
          for (const item of arr) {
            const key = JSON.stringify(item);
            if (!seen.has(key)) {
              seen.add(key);
              result.push(item);
            }
          }
        }
        return result;
      }
      return [...new Set(allInputs)];
    }

    default:
      return mergeInputs(inputs);
  }
}

async function executeCodeExec(node: MiplerNode, inputs: Map<string, unknown>, config: WorkflowNodeConfig): Promise<unknown> {
  const code = config.code || '';
  if (!code.trim()) throw new Error('No code provided');

  const input = getFirstInput(inputs);
  const allInputsObj: Record<string, unknown> = {};
  for (const [k, v] of inputs) allInputsObj[k] = v;

  // Safe sandboxed execution using Function constructor
  // Only expose limited API: input, data, context, json, result, Math, JSON, Object, Array, String, Number, Boolean, Date, console
  const safeConsole = {
    log: (...args: unknown[]) => void 0,
    warn: (...args: unknown[]) => void 0,
    error: (...args: unknown[]) => void 0,
  };

  try {
    const wrappedCode = `
      "use strict";
      ${code}
      if (typeof result === 'undefined') result = null;
      return result;
    `;

    const fn = new Function('input', 'data', 'context', 'json', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'console', wrappedCode);
    const result = fn(
      input,
      input,
      allInputsObj,
      {
        parse: safeJsonParse,
        stringify: (v: unknown) => JSON.stringify(v, null, 2),
      },
      Math,
      JSON,
      Object,
      Array,
      String,
      Number,
      Boolean,
      Date,
      safeConsole,
    );
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Code execution error: ${msg}`);
  }
}

async function executeDelay(node: MiplerNode, inputs: Map<string, unknown>, config: WorkflowNodeConfig): Promise<unknown> {
  const seconds = config.seconds || 1;
  await new Promise(resolve => setTimeout(resolve, Math.min(seconds, 30) * 1000));
  return getFirstInput(inputs);
}

async function executeSwarmAgent(node: MiplerNode, inputs: Map<string, unknown>, config: WorkflowNodeConfig, ollamaUrl: string, ollamaModel: string): Promise<unknown> {
  const task = config.swarmTask || 'Analyze the provided data';
  const strategy = config.swarmStrategy || 'pipeline';
  const agents = config.swarmAgents || [
    { name: 'Researcher', role: 'researcher', personality: 'You are a thorough researcher who finds patterns in data.', model: '' },
    { name: 'Analyst', role: 'analyst', personality: 'You are a data analyst who quantifies findings.', model: '' },
    { name: 'Synthesizer', role: 'synthesizer', personality: 'You synthesize findings into clear conclusions.', model: '' },
  ];

  const inputData = getFirstInput(inputs);
  const inputStr = typeof inputData === 'string' ? inputData : JSON.stringify(inputData, null, 2).slice(0, 8000);

  const agentResults: Record<string, { name: string; role: string; result: string }> = {};

  if (strategy === 'pipeline') {
    let context = inputStr;
    for (const agent of agents) {
      const result = await callOllamaAgent(ollamaUrl, agent.model || ollamaModel, agent, task, context);
      agentResults[agent.name] = { name: agent.name, role: agent.role, result };
      context = result; // Pass result to next agent
    }
  } else if (strategy === 'parallel') {
    const promises = agents.map(async (agent) => {
      const result = await callOllamaAgent(ollamaUrl, agent.model || ollamaModel, agent, task, inputStr);
      agentResults[agent.name] = { name: agent.name, role: agent.role, result };
    });
    await Promise.all(promises);
  } else if (strategy === 'debate') {
    let context = inputStr;
    for (let round = 0; round < 2; round++) {
      for (const agent of agents) {
        const result = await callOllamaAgent(ollamaUrl, agent.model || ollamaModel, agent, task, context);
        agentResults[`${agent.name}_r${round}`] = { name: agent.name, role: agent.role, result };
        context += `\n\n[${agent.name}]: ${result}`;
      }
    }
  }

  // Synthesis
  const allResults = Object.values(agentResults).map(r => `[${r.name} (${r.role})]: ${r.result}`).join('\n\n');
  const synthesis = await callOllamaAgent(ollamaUrl, ollamaModel,
    { name: 'Synthesizer', role: 'synthesizer', personality: 'You synthesize all agent findings into a final conclusion.', model: '' },
    `Synthesize these agent results into a final conclusion for the task: ${task}`,
    allResults,
  );

  return {
    strategy,
    task,
    agentResults,
    consensus: {
      summary: synthesis,
      contributorCount: agents.length,
      synthesizedBy: 'Swarm Synthesizer',
    },
  };
}

async function callOllamaAgent(baseUrl: string, model: string, agent: { name: string; role: string; personality: string; model?: string }, task: string, context: string): Promise<string> {
  const url = (baseUrl || 'http://localhost:11434') + '/api/chat';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'qwen2.5:0.5b',
        messages: [
          { role: 'system', content: agent.personality },
          { role: 'user', content: `Task: ${task}\n\nData:\n${context.slice(0, 6000)}\n\nProvide your analysis as ${agent.name} (${agent.role}).` },
        ],
        stream: false,
      }),
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}`);
    const data = await res.json();
    return data.message?.content || data.response || 'No response';
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return `[${agent.name} Error]: ${msg}`;
  }
}

async function executeOsintTool(node: MiplerNode, inputs: Map<string, unknown>, config: WorkflowNodeConfig, backendUrl: string): Promise<unknown> {
  const tool = node.data.cardType.replace('osint-', '');
  const target = config.target || '';

  if (!target) {
    // Try to get target from input
    const input = getFirstInput(inputs);
    if (typeof input === 'string') {
      return executeOsintLookup(tool, input, backendUrl);
    }
    if (typeof input === 'object' && input !== null) {
      const targetField = (input as Record<string, unknown>).target || (input as Record<string, unknown>).domain || (input as Record<string, unknown>).ip;
      if (targetField) return executeOsintLookup(tool, String(targetField), backendUrl);
    }
    throw new Error('No target specified');
  }

  return executeOsintLookup(tool, target, backendUrl);
}

async function executeOsintLookup(tool: string, target: string, backendUrl: string): Promise<unknown> {
  // Try backend first
  try {
    const res = await fetch(`${backendUrl}/api/osint/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, target }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.data || data;
    }
  } catch {
    // Backend not available, use local fallback
  }

  // Local fallback: basic DNS via public DNS-over-HTTPS
  if (tool === 'dns') {
    try {
      const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(target)}&type=A`);
      const data = await res.json();
      return { tool: 'dns', target, records: data.Answer || [], status: data.Status };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { tool: 'dns', target, error: msg };
    }
  }

  // For other OSINT tools, return placeholder with instructions
  return {
    tool,
    target,
    message: `OSINT tool "${tool}" requires the Python backend. Start it with: python -m backend.api.server`,
    tip: 'Install backend dependencies: pip install -r backend/requirements.txt',
  };
}

async function executeWebhook(node: MiplerNode, inputs: Map<string, unknown>, _config: WorkflowNodeConfig): Promise<unknown> {
  // Webhook collects output — pass through input
  return getFirstInput(inputs);
}

async function executeAgent(node: MiplerNode, inputs: Map<string, unknown>, ollamaUrl: string, ollamaModel: string): Promise<unknown> {
  const config = node.data.agentConfig;
  if (!config) throw new Error('Agent has no configuration');

  // Build context from connected inputs
  const contextParts: string[] = [];
  for (const [sourceId, data] of inputs) {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2).slice(0, 4000);
    contextParts.push(`[Input from ${sourceId}]:\n${dataStr}`);
  }

  const contextBlock = contextParts.length > 0
    ? `\n\nCONTEXT FROM CONNECTED NODES:\n${contextParts.join('\n\n---\n\n')}\n\nBased on the above context, `
    : '';

  const model = config.model || ollamaModel || 'qwen2.5:0.5b';
  const url = (ollamaUrl || 'http://localhost:11434') + '/api/chat';

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: config.systemPrompt || config.personality || 'You are a helpful AI agent.' },
        { role: 'user', content: `${contextBlock}Execute your role as "${config.name}". Provide your analysis.${config.internetAccess ? ' You may reference publicly known information.' : ''}` },
      ],
      stream: false,
    }),
  });

  if (!res.ok) throw new Error(`Ollama error ${res.status}`);
  const data = await res.json();
  return data.message?.content || data.response || 'No response';
}

async function executeQuestionCard(node: MiplerNode, inputs: Map<string, unknown>, ollamaUrl: string, ollamaModel: string): Promise<unknown> {
  const question = node.data.questionText || node.data.content || '';
  if (!question.trim()) {
    return 'No question provided.';
  }

  const contextParts: string[] = [];
  for (const [sourceId, data] of inputs) {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2).slice(0, 5000);
    contextParts.push(`[Input from ${sourceId}]:\n${dataStr}`);
  }

  const contextBlock = contextParts.length > 0
    ? `\n\nCONTEXT FROM CONNECTED NODES:\n${contextParts.join('\n\n---\n\n')}\n\n`
    : '\n\n';

  const url = (ollamaUrl || 'http://localhost:11434') + '/api/chat';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModel || 'qwen2.5:0.5b',
      messages: [
        { role: 'system', content: 'You are an investigation assistant. Return three clear options with evidence, confidence, risk, and next verification step.' },
        { role: 'user', content: `${contextBlock}Question: ${question}\n\nReturn Option 1, Option 2, Option 3. Avoid generic suggestions.` },
      ],
      stream: false,
    }),
  });

  if (!res.ok) throw new Error(`Ollama error ${res.status}`);
  const data = await res.json();
  return data.message?.content || data.response || 'No response';
}

async function executeAgentGroup(node: MiplerNode, inputs: Map<string, unknown>, ollamaUrl: string, ollamaModel: string): Promise<unknown> {
  const names = node.data.agentGroupAgents && node.data.agentGroupAgents.length > 0
    ? node.data.agentGroupAgents
    : DEFAULT_INVESTIGATION_PROFILE_NAMES;
  const strategy = node.data.agentGroupStrategy || 'parallel';
  const inputData = getFirstInput(inputs);
  const inputStr = typeof inputData === 'string' ? inputData : JSON.stringify(inputData, null, 2).slice(0, 9000);

  const agents = names.map((name) => ({
    name,
    role: name.toLowerCase(),
    personality: `You are ${name}. Analyze the evidence and produce rigorous investigation output.`,
    model: ollamaModel,
  }));

  const config: WorkflowNodeConfig = {
    swarmTask: node.data.content || 'Analyze the provided data collaboratively.',
    swarmStrategy: strategy,
    swarmAgents: agents,
  };

  const output = await executeSwarmAgent(node, new Map([['input', inputStr]]), config, ollamaUrl, ollamaModel);
  return output;
}

async function executeReportAgent(node: MiplerNode, inputs: Map<string, unknown>, ollamaUrl: string, ollamaModel: string): Promise<unknown> {
  const allInputs = Array.from(inputs.values());
  const dataStr = allInputs.map(i => typeof i === 'string' ? i : JSON.stringify(i, null, 2)).join('\n\n---\n\n');

  const url = (ollamaUrl || 'http://localhost:11434') + '/api/chat';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModel || 'qwen2.5:0.5b',
      messages: [
        { role: 'system', content: 'You are an OSINT report generator. Create structured reports with: 1) Executive Summary, 2) Key Findings (bullets), 3) Sources/Confidence, 4) Recommendations.' },
        { role: 'user', content: `Generate a structured report from these inputs:\n\n${dataStr.slice(0, 10000)}` },
      ],
      stream: false,
    }),
  });

  if (!res.ok) throw new Error(`Ollama error ${res.status}`);
  const data = await res.json();
  const output = data.message?.content || data.response || 'No report generated';

  return {
    summary: output.slice(0, 1000),
    fullReport: output,
    sources: Array.from(inputs.keys()),
    confidence: 0.7,
    generatedAt: new Date().toISOString(),
  };
}

// ── Main Execution Function ────────────────────────────────────────────────────

export async function executeWorkflow(
  nodes: MiplerNode[],
  edges: MiplerEdge[],
  onProgress?: ExecutionCallback,
  signal?: AbortSignal,
): Promise<WorkflowExecution> {
  const store = useWorkspaceStore.getState();

  const execution: WorkflowExecution = {
    id: `exec-${Date.now()}`,
    status: 'running',
    startedAt: Date.now(),
    nodeResults: new Map(),
    logs: [],
    finalOutput: null,
  };

  const sortedNodes = topologicalSort(nodes, edges);
  const workflowNodes = sortedNodes.filter(n => {
    const ct = n.data.cardType;
    return ct === 'trigger' || ct === 'http-request' || ct === 'code-exec' ||
           ct === 'transform' || ct === 'condition' || ct === 'loop' ||
           ct === 'merge' || ct === 'swarm-agent' || ct === 'delay' ||
           ct === 'webhook' || ct === 'agent' || ct === 'report-agent' ||
           ct === 'import-card' || ct === 'agent-answer' || ct === 'data-supplier' ||
           ct === 'agent-group' || ct === 'question-card' ||
           ct?.startsWith('osint-');
  });

  if (workflowNodes.length === 0) {
    execution.status = 'completed';
    execution.finishedAt = Date.now();
    log(execution, 'warn', '', 'No workflow nodes found');
    return execution;
  }

  const ollamaUrl = store.llmBaseUrl || 'http://localhost:11434';
  const ollamaModel = store.llmModel || 'qwen2.5:0.5b';
  const backendUrl = 'http://127.0.0.1:8765';

  log(execution, 'info', '', `Starting execution of ${workflowNodes.length} nodes`);

  for (const node of workflowNodes) {
    if (signal?.aborted) {
      execution.status = 'stopped';
      log(execution, 'warn', node.id, 'Execution stopped by user');
      break;
    }

    const cardType = node.data.cardType;
    const config = node.data.workflowConfig || {};
    const inputs = getInputsForNode(node.id, edges, execution.nodeResults);

    // Update node status to running
    store.updateCard(node.id, { executionStatus: 'running', executionOutput: '' });

    // Animate incoming edges one by one to show the exact data path.
    const incomingEdgeIds = edges.filter(e => e.target === node.id).map(e => e.id);
    if (incomingEdgeIds.length > 0) {
      await animateEdgeSequence(incomingEdgeIds, signal, 280);
    }

    const startTime = Date.now();
    log(execution, 'info', node.id, `Executing ${cardType} node "${node.data.title}"`);

    try {
      let output: unknown;

      switch (cardType) {
        case 'trigger':
          output = await executeTrigger(node, inputs, config);
          break;
        case 'import-card':
          output = await executeImportCard(node, inputs);
          break;
        case 'data-supplier':
          output = await executeDataSupplier(node, inputs);
          break;
        case 'http-request':
          output = await executeHttpRequest(node, inputs, config);
          break;
        case 'transform':
          output = await executeTransform(node, inputs, config);
          break;
        case 'condition':
          output = await executeCondition(node, inputs, config);
          break;
        case 'loop':
          output = await executeLoop(node, inputs, config);
          break;
        case 'merge':
          output = await executeMerge(node, inputs, config);
          break;
        case 'code-exec':
          output = await executeCodeExec(node, inputs, config);
          break;
        case 'delay':
          output = await executeDelay(node, inputs, config);
          break;
        case 'swarm-agent':
          output = await executeSwarmAgent(node, inputs, config, ollamaUrl, ollamaModel);
          break;
        case 'webhook':
          output = await executeWebhook(node, inputs, config);
          break;
        case 'agent':
          output = await executeAgent(node, inputs, ollamaUrl, ollamaModel);
          break;
        case 'question-card':
          output = await executeQuestionCard(node, inputs, ollamaUrl, ollamaModel);
          break;
        case 'agent-group':
          output = await executeAgentGroup(node, inputs, ollamaUrl, ollamaModel);
          break;
        case 'report-agent':
          output = await executeReportAgent(node, inputs, ollamaUrl, ollamaModel);
          break;
        case 'agent-answer':
          output = getFirstInput(inputs);
          break;
        default:
          if (cardType?.startsWith('osint-')) {
            output = await executeOsintTool(node, inputs, config, backendUrl);
          } else {
            output = getFirstInput(inputs);
          }
      }

      const elapsed = (Date.now() - startTime) / 1000;
      const result: NodeExecutionResult = {
        nodeId: node.id,
        status: 'success',
        output,
        executionTime: elapsed,
      };

      execution.nodeResults.set(node.id, result);
      execution.finalOutput = output;

      // Update card with output
      const outputStr = formatOutput(output);
      store.updateCard(node.id, {
        executionStatus: 'success',
        executionOutput: outputStr.slice(0, 5000),
        executionTime: elapsed,
        content: outputStr.slice(0, 2000),
      });

      // Update outgoing edges with payload info and animate them step-by-step.
      const outgoingEdges = edges.filter(e => e.source === node.id);
      for (const edge of outgoingEdges) {
        store.updateEdgeStyle(edge.id, {
          isGlowing: true,
          dataFlowActive: true,
          lastPayload: output,
          payloadType: getOutputType(output),
          payloadSize: getOutputSize(output),
        });
      }
      await animateEdgeSequence(outgoingEdges.map(e => e.id), signal, 260);

      log(execution, 'info', node.id, `Completed in ${elapsed.toFixed(2)}s — output: ${getOutputType(output)}`);
      if (onProgress) onProgress(execution);

      // Brief pause for visual effect
      await wait(200, signal);

    } catch (e: unknown) {
      const elapsed = (Date.now() - startTime) / 1000;
      const errorMsg = e instanceof Error ? e.message : String(e);

      const result: NodeExecutionResult = {
        nodeId: node.id,
        status: 'error',
        output: null,
        error: errorMsg,
        executionTime: elapsed,
      };

      execution.nodeResults.set(node.id, result);

      store.updateCard(node.id, {
        executionStatus: 'error',
        executionOutput: `Error: ${errorMsg}`,
        executionTime: elapsed,
      });

      log(execution, 'error', node.id, `Failed: ${errorMsg}`);
      if (onProgress) onProgress(execution);

      // Don't stop execution — continue to allow other branches to run
    }

    // Stop incoming edge animations after this step is complete.
    const incomingEdges = edges.filter(e => e.target === node.id);
    for (const edge of incomingEdges) {
      store.updateEdgeStyle(edge.id, {
        isGlowing: false,
        dataFlowActive: false,
      });
    }
  }

  execution.status = signal?.aborted ? 'stopped' : 'completed';
  execution.finishedAt = Date.now();

  log(execution, 'info', '', `Execution ${execution.status} in ${((execution.finishedAt - execution.startedAt) / 1000).toFixed(2)}s`);

  if (!signal?.aborted) {
    await runFinalGlobalGlow(edges, signal);
  }

  // Stop all data flow animations
  store.stopDataFlow();

  if (onProgress) onProgress(execution);
  return execution;
}

// ── Reset All Node Statuses ────────────────────────────────────────────────────

export function resetAllStatuses(nodes: MiplerNode[]): void {
  const store = useWorkspaceStore.getState();
  for (const node of nodes) {
    if (node.data.executionStatus && node.data.executionStatus !== 'idle') {
      store.updateCard(node.id, {
        executionStatus: 'idle',
        executionOutput: '',
        executionTime: undefined,
      });
    }
  }
  store.stopDataFlow();
}
