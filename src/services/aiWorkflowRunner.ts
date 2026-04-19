import { apiService, type WorkflowEdge, type WorkflowNode } from './api';
import { executeWorkflow as executeLocalWorkflow } from './workflowEngine';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import type { CardData, MiplerEdge, MiplerNode } from '../types';
import {
  buildInvestigationIntake,
  tryParseJsonText,
} from '../utils/investigationFlow';

type BackendNodeStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped' | 'waiting';

const EXECUTABLE_CARD_TYPES = new Set<string>([
  'trigger',
  'import-card',
  'data-supplier',
  'agent',
  'agent-group',
  'report-agent',
  'question-card',
  'agent-answer',
  'http-request',
  'code-exec',
  'transform',
  'condition',
  'loop',
  'merge',
  'swarm-agent',
  'osint-whois',
  'osint-dns',
  'osint-subdomain',
  'osint-ip',
  'osint-email',
  'osint-portscan',
  'delay',
  'webhook',
]);

function buildWorkflowGraphContext(nodes: MiplerNode[], edges: MiplerEdge[]): Record<string, unknown> {
  const nodeLookup = new Map(nodes.map((node) => [node.id, node]));

  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      title: node.data.title || node.id,
      card_type: node.data.cardType,
    })),
    edges: edges.map((edge) => ({
      source: nodeLookup.get(edge.source)?.data.title || edge.source,
      target: nodeLookup.get(edge.target)?.data.title || edge.target,
    })),
  };
}

function getSimulationRequest(nodes: MiplerNode[]): string {
  const questionNode = nodes.find((node) => node.data.cardType === 'question-card');
  return questionNode?.data.questionText || questionNode?.data.content || '';
}

function mapCardTypeToBackendType(cardType: string): string {
  switch (cardType) {
    case 'import-card':
      return 'import';
    case 'data-supplier':
      return 'transform';
    case 'agent-group':
      return 'swarm';
    case 'report-agent':
      return 'report';
    case 'question-card':
      return 'agent';
    case 'agent-answer':
      return 'answer';
    case 'swarm-agent':
      return 'swarm';
    default:
      return cardType;
  }
}

function buildNodeConfig(
  node: MiplerNode,
  llmBaseUrl: string,
  llmModel: string,
  graphContext: Record<string, unknown>,
  simulationRequest: string,
): Record<string, unknown> {
  const data = node.data;
  const cardType = data.cardType;
  const cfg: Record<string, unknown> = {
    ...(data.workflowConfig || {}),
    graph_context: graphContext,
  };

  if (cardType === 'import-card') {
    const parsedContent = tryParseJsonText(data.content || '');
    cfg.data = parsedContent ?? (data.content || '');
    cfg.text = parsedContent ? JSON.stringify(parsedContent).slice(0, 10000) : data.content || '';
    cfg.files = (data.importedFiles || []).map((f) => ({
      name: f.name,
      type: f.type,
      data: typeof f.data === 'string' ? f.data.slice(0, 10000) : JSON.stringify(f.data).slice(0, 10000),
      size: f.size,
    }));
  }

  if (cardType === 'data-supplier') {
    cfg.transform = 'passthrough';
  }

  if (cardType === 'agent') {
    const agentConfig = data.agentConfig;
    cfg.agent = {
      name: agentConfig?.name || data.title || 'Agent',
      role: agentConfig?.role || 'analyst',
      personality: agentConfig?.personality || agentConfig?.systemPrompt || 'You are a helpful AI assistant.',
      behavior: agentConfig?.behavior || '',
      profile_name: agentConfig?.profileName || '',
      model: agentConfig?.model || llmModel,
      ollama_url: llmBaseUrl,
      internet_access: !!agentConfig?.internetAccess,
      web_search_enabled: !!agentConfig?.internetAccess,
      response_style: 'options-only',
    };
    cfg.task =
      (data.content || `Execute your role as ${agentConfig?.name || data.title || 'Agent'}.`) +
      '\n\nReturn options only. Do not give open-ended suggestions.';
  }

  if (cardType === 'question-card') {
    const question = data.questionText || data.content || '';
    cfg.agent = {
      name: data.title || 'Question Agent',
      role: 'analyst',
      personality: 'You answer user questions based on upstream investigation context. Be specific and evidence-based.',
      model: llmModel,
      ollama_url: llmBaseUrl,
      internet_access: false,
      web_search_enabled: false,
      response_style: 'options-only',
    };
    cfg.task =
      (question || 'Answer the question from the provided context.') +
      '\n\nUse the graph context and upstream evidence to answer as an investigation analyst.' +
      '\n\nReturn options only. Do not give open-ended suggestions.';
  }

  if (cardType === 'agent-group' || cardType === 'swarm-agent') {
    const names = Array.isArray(data.agentGroupAgents) ? data.agentGroupAgents : [];
    const allowWebSearch = !!data.workflowConfig?.allowWebSearch;
    cfg.strategy = data.agentGroupStrategy || 'parallel';
    cfg.simulation_request = simulationRequest;
    cfg.task =
      (data.content || 'Analyze the input data collaboratively for an investigation case.') +
      '\n\nTreat the upstream graph as case evidence, identify leads, and produce a realistic investigation simulation for the requested scenario.' +
      '\n\nReturn options only. Do not give open-ended suggestions.';
    cfg.agents = names.length > 0
      ? names.map((name, index) => ({
          name,
          role: index === 0 ? 'orchestrator' : 'analyst',
          personality: '',
          behavior: '',
          profile_name: name,
          model: llmModel,
          ollama_url: llmBaseUrl,
          internet_access: allowWebSearch,
          web_search_enabled: allowWebSearch,
          response_style: 'options-only',
        }))
      : [];
  }

  if (cardType === 'report-agent') {
    cfg.mode = 'summary';
    cfg.simulation_request = simulationRequest;
  }

  if (cardType.startsWith('osint-')) {
    cfg.target = cfg.target || data.content || '';
  }

  return cfg;
}

function toBackendNode(
  node: MiplerNode,
  llmBaseUrl: string,
  llmModel: string,
  graphContext: Record<string, unknown>,
  simulationRequest: string,
): WorkflowNode {
  return {
    id: node.id,
    type: mapCardTypeToBackendType(node.data.cardType),
    name: node.data.title || node.id,
    config: buildNodeConfig(node, llmBaseUrl, llmModel, graphContext, simulationRequest),
    position: node.position,
  };
}

function toBackendEdge(edge: MiplerEdge): WorkflowEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || 'output',
    targetHandle: edge.targetHandle || 'input',
  };
}

function applyNodeStatus(nodeId: string, status: BackendNodeStatus, output?: unknown, error?: string | null): void {
  const store = useWorkspaceStore.getState();
  const node = store.nodes.find((n) => n.id === nodeId);
  if (!node) return;

  const executionStatus: CardData['executionStatus'] =
    status === 'running'
      ? 'running'
      : status === 'success'
        ? 'success'
        : status === 'error'
          ? 'error'
          : status === 'skipped'
            ? 'skipped'
            : 'idle';

  const outputString =
    output == null
      ? ''
      : typeof output === 'string'
        ? output
        : JSON.stringify(output, null, 2);

  const patch: Partial<CardData> = {
    executionStatus,
    executionOutput: error ? `Error: ${error}` : outputString.slice(0, 5000),
  };

  if (node.data.cardType === 'report-agent' && output && typeof output === 'object') {
    const out = output as Record<string, unknown>;
    const summary = typeof out.summary === 'string' ? out.summary : '';
    const findings = Array.isArray(out.findings)
      ? out.findings.filter((f): f is string => typeof f === 'string')
      : [];
    const sources = Array.isArray(out.sources)
      ? out.sources.filter((s): s is string => typeof s === 'string')
      : [];
    const confidence = typeof out.confidence === 'number' ? out.confidence : 0.5;
    const threatLevel = typeof out.threat_level === 'string' ? out.threat_level : undefined;
    const questionAnswer = typeof out.question_answer === 'string' ? out.question_answer : undefined;
    const simulation =
      out.simulation && typeof out.simulation === 'object'
        ? {
            scenario: typeof (out.simulation as Record<string, unknown>).scenario === 'string'
              ? (out.simulation as Record<string, unknown>).scenario as string
              : '',
            forecast: typeof (out.simulation as Record<string, unknown>).forecast === 'string'
              ? (out.simulation as Record<string, unknown>).forecast as string
              : '',
            assumptions: Array.isArray((out.simulation as Record<string, unknown>).assumptions)
              ? ((out.simulation as Record<string, unknown>).assumptions as unknown[])
                  .filter((item): item is string => typeof item === 'string')
              : [],
            confidence: typeof (out.simulation as Record<string, unknown>).confidence === 'number'
              ? (out.simulation as Record<string, unknown>).confidence as number
              : 0,
          }
        : undefined;
    const priorityActions = Array.isArray(out.priority_actions)
      ? out.priority_actions.filter((a): a is string => typeof a === 'string')
      : [];
    const intelligenceGaps = Array.isArray(out.intelligence_gaps)
      ? out.intelligence_gaps.filter((g): g is string => typeof g === 'string')
      : [];
    const options = Array.isArray(out.options)
      ? out.options
          .filter((o): o is Record<string, unknown> => !!o && typeof o === 'object')
          .slice(0, 3)
          .map((o, idx) => {
            const risk: 'low' | 'medium' | 'high' =
              o.risk === 'low' || o.risk === 'medium' || o.risk === 'high'
                ? o.risk
                : 'medium';
            return {
              title: typeof o.title === 'string' ? o.title : `Option ${idx + 1}`,
              decision: typeof o.decision === 'string' ? o.decision : '',
              evidence: typeof o.evidence === 'string' ? o.evidence : '',
              confidence: typeof o.confidence === 'number' ? o.confidence : 50,
              risk,
              verificationStep: typeof o.verification_step === 'string' ? o.verification_step : '',
            };
          })
      : [];

    patch.reportData = {
      summary,
      findings,
      sources,
      confidence,
      generatedAt: new Date().toISOString(),
      threatLevel,
      questionAnswer,
      simulation,
      priorityActions,
      intelligenceGaps,
      options,
    };
    const summaryPlusActions = [summary, ...priorityActions.slice(0, 3)].join('\n');
    patch.content = summaryPlusActions.slice(0, 2000);
  }

  if (node.data.cardType === 'agent-answer') {
    const answer =
      typeof output === 'string'
        ? output
        : output && typeof output === 'object' && typeof (output as Record<string, unknown>).answer === 'string'
          ? ((output as Record<string, unknown>).answer as string)
          : outputString;
    patch.answerText = answer;
    patch.content = answer.slice(0, 2000);
    patch.answerStatus = error ? 'negative' : answer ? 'positive' : 'neutral';
  }

  store.updateCard(nodeId, patch);
}

function resetExecutionState(nodes: MiplerNode[], edges: MiplerEdge[]): void {
  const store = useWorkspaceStore.getState();

  for (const node of nodes) {
    if (!EXECUTABLE_CARD_TYPES.has(node.data.cardType)) continue;
    const patch: Partial<CardData> = {
      executionStatus: 'idle',
      executionOutput: '',
      executionTime: undefined,
    };

    if (node.data.cardType === 'agent-answer') {
      patch.answerText = '';
      patch.answerStatus = 'pending';
    }

    if (node.data.cardType === 'report-agent') {
      patch.reportData = undefined;
    }

    store.updateCard(node.id, patch);
  }

  for (const edge of edges) {
    store.updateEdgeStyle(edge.id, { isGlowing: false, dataFlowActive: false, lastPayload: undefined });
  }

  store.stopDataFlow();
}

let activeUnsubscribers: Array<() => void> = [];
let pollTimer: ReturnType<typeof setInterval> | null = null;
let localExecutionAbortController: AbortController | null = null;
let finalGlowAbortController: AbortController | null = null;
const nodeFlowTokens = new Map<string, number>();

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
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

function nextNodeFlowToken(nodeId: string): number {
  const token = (nodeFlowTokens.get(nodeId) || 0) + 1;
  nodeFlowTokens.set(nodeId, token);
  return token;
}

async function animateNodeEdges(nodeId: string, direction: 'incoming' | 'outgoing'): Promise<void> {
  const token = nextNodeFlowToken(nodeId);
  const edgeSelector = direction === 'incoming'
    ? (e: MiplerEdge) => e.target === nodeId
    : (e: MiplerEdge) => e.source === nodeId;

  const edgeIds = useWorkspaceStore.getState().edges.filter(edgeSelector).map((e) => e.id);
  for (const edgeId of edgeIds) {
    if (nodeFlowTokens.get(nodeId) !== token) return;
    const store = useWorkspaceStore.getState();
    if (!store.isExecuting) return;
    store.updateEdgeStyle(edgeId, { isGlowing: true, dataFlowActive: true });
    try {
      await wait(260);
    } catch {
      return;
    }
    if (nodeFlowTokens.get(nodeId) !== token) return;
    useWorkspaceStore.getState().updateEdgeStyle(edgeId, { isGlowing: true, dataFlowActive: false });
  }
}

async function runFinalGlobalGlowPhase(durationMs = 10000): Promise<void> {
  finalGlowAbortController?.abort();
  const abortController = new AbortController();
  finalGlowAbortController = abortController;

  const store = useWorkspaceStore.getState();
  const edgeIds = store.edges.map((e) => e.id);
  for (const edgeId of edgeIds) {
    store.updateEdgeStyle(edgeId, { isGlowing: true, dataFlowActive: true });
  }

  try {
    await wait(durationMs, abortController.signal);
  } catch {
    // Glow phase cancelled by stop/restart.
  }
}

async function finishExecutionWithGlow(executionId: string): Promise<void> {
  const store = useWorkspaceStore.getState();
  if (store.executionId !== executionId) return;

  await runFinalGlobalGlowPhase(10000);

  const latest = useWorkspaceStore.getState();
  if (latest.executionId !== executionId) return;

  latest.setIsExecuting(false);
  latest.setExecutionId(null);
  latest.stopDataFlow();
  clearActiveListeners();
}

function clearActiveListeners(): void {
  for (const unsub of activeUnsubscribers) {
    unsub();
  }
  activeUnsubscribers = [];

  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  nodeFlowTokens.clear();
}

function registerExecutionListeners(executionId: string): void {
  clearActiveListeners();
  finalGlowAbortController?.abort();
  finalGlowAbortController = null;

  const onNodeStatus = (payload: unknown) => {
    const evt = payload as {
      execution_id?: string;
      node_id?: string;
      status?: BackendNodeStatus;
      output?: unknown;
      error?: string | null;
    };
    if (evt.execution_id !== executionId || !evt.node_id || !evt.status) return;

    applyNodeStatus(evt.node_id, evt.status, evt.output, evt.error || null);

    if (evt.status === 'running') {
      void animateNodeEdges(evt.node_id, 'incoming');
    } else if (evt.status === 'success' || evt.status === 'error') {
      void animateNodeEdges(evt.node_id, 'outgoing');
    }
  };

  const onExecutionComplete = async (payload: unknown) => {
    const evt = payload as { execution_id?: string };
    if (evt.execution_id !== executionId) return;

    try {
      const finalStatus = await apiService.getExecution(executionId);
      for (const nodeStatus of Object.values(finalStatus.nodes)) {
        applyNodeStatus(nodeStatus.id, nodeStatus.status as BackendNodeStatus, nodeStatus.output, nodeStatus.error);
      }
      await finishExecutionWithGlow(executionId);
    } finally {
      // State transitions are handled in finishExecutionWithGlow.
    }
  };

  apiService.on('node_status', onNodeStatus);
  apiService.on('execution_complete', onExecutionComplete);

  activeUnsubscribers.push(() => apiService.off('node_status', onNodeStatus));
  activeUnsubscribers.push(() => apiService.off('execution_complete', onExecutionComplete));

  pollTimer = setInterval(async () => {
    const store = useWorkspaceStore.getState();
    if (!store.isExecuting || store.executionId !== executionId) {
      clearActiveListeners();
      return;
    }

    try {
      const status = await apiService.getExecution(executionId);
      for (const nodeStatus of Object.values(status.nodes)) {
        applyNodeStatus(nodeStatus.id, nodeStatus.status as BackendNodeStatus, nodeStatus.output, nodeStatus.error);
      }

      if (status.finished_at) {
        await finishExecutionWithGlow(executionId);
      }
    } catch {
      // Keep polling; transient network issues are expected.
    }
  }, 800);
}

export async function stopAiWorkflowExecution(): Promise<void> {
  const store = useWorkspaceStore.getState();
  const runningId = store.executionId;

  clearActiveListeners();
  finalGlowAbortController?.abort();
  finalGlowAbortController = null;

  if (localExecutionAbortController) {
    localExecutionAbortController.abort();
    localExecutionAbortController = null;
  }

  if (runningId) {
    try {
      if (!runningId.startsWith('local-')) {
        await apiService.stopExecution(runningId);
      }
    } catch {
      // Best effort stop.
    }
  }

  store.setIsExecuting(false);
  store.setExecutionId(null);
  store.stopDataFlow();
}

export async function startAiWorkflowExecution(): Promise<'backend' | 'local' | 'none'> {
  const store = useWorkspaceStore.getState();
  const active = store.getActiveInvestigation();

  if (!active?.isAiAnalysis) {
    return 'none';
  }

  if (store.isExecuting) {
    return 'none';
  }

  const previewNode = store.nodes.find((node) => node.data.cardType === 'investigation-preview');
  if (previewNode) {
    const intake = buildInvestigationIntake(store.nodes);
    const previewSignature = previewNode.data.previewData?.sourceSignature || '';
    const approvedSignature = previewNode.data.workflowConfig?.previewApprovedSignature || '';
    const readyToContinue = previewNode.data.previewData?.readyToContinue ?? false;

    if (!readyToContinue || !previewSignature || previewSignature !== intake.signature || approvedSignature !== intake.signature) {
      throw new Error('Build the Investigation Preview and click Continue Investigation before running the workflow.');
    }
  }

  const workflowNodes = store.nodes.filter((n) => EXECUTABLE_CARD_TYPES.has(n.data.cardType));
  if (workflowNodes.length === 0) {
    throw new Error('No executable workflow nodes found in this workspace.');
  }

  const workflowEdges = store.edges.filter((e) =>
    workflowNodes.some((n) => n.id === e.source) && workflowNodes.some((n) => n.id === e.target),
  );

  resetExecutionState(workflowNodes, workflowEdges);

  store.setIsExecuting(true);
  store.setExecutionId(null);

  const graphContext = buildWorkflowGraphContext(workflowNodes, workflowEdges);
  const simulationRequest = getSimulationRequest(workflowNodes);
  const backendNodes = workflowNodes.map((n) =>
    toBackendNode(n, store.llmBaseUrl, store.llmModel, graphContext, simulationRequest),
  );
  const backendEdges = workflowEdges.map(toBackendEdge);

  try {
    apiService.connectWs();
    await apiService.health();

    const run = await apiService.executeWorkflow(backendNodes, backendEdges, active.id);
    store.setExecutionId(run.execution_id);
    registerExecutionListeners(run.execution_id);
    return 'backend';
  } catch {
    // Fallback to local execution if backend is unavailable.
    const localExecutionId = `local-${Date.now()}`;
    store.setExecutionId(localExecutionId);

    const controller = new AbortController();
    localExecutionAbortController = controller;

    void (async () => {
      try {
        await executeLocalWorkflow(workflowNodes, workflowEdges, undefined, controller.signal);
      } finally {
        const s = useWorkspaceStore.getState();
        if (s.executionId === localExecutionId) {
          s.setIsExecuting(false);
          s.setExecutionId(null);
          s.stopDataFlow();
        }
        localExecutionAbortController = null;
      }
    })();
    return 'local';
  }
}

export async function restartAiWorkflowExecution(): Promise<'backend' | 'local' | 'none'> {
  const store = useWorkspaceStore.getState();
  if (store.isExecuting) {
    await stopAiWorkflowExecution();
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return startAiWorkflowExecution();
}
