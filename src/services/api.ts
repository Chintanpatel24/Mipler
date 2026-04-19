/**
 * Mipler Backend API Service
 * Communicates with the Python FastAPI backend for workflow execution
 */

const API_BASE = 'http://127.0.0.1:8765';

export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  condition?: string;
}

export interface ExecutionStatus {
  id: string;
  workflow_id: string;
  status: string;
  started_at: number;
  finished_at: number;
  nodes: Record<string, {
    id: string;
    name: string;
    type: string;
    status: string;
    error: string | null;
    execution_time: number;
    has_output: boolean;
    output?: unknown;
  }>;
  logs: Array<{ timestamp: number; level: string; message: string; node_id: string }>;
}

export interface OSINTResult {
  tool: string;
  target: string;
  success: boolean;
  data: Record<string, unknown>;
  error: string | null;
}

export interface SwarmResult {
  swarm_id: string;
  strategy: string;
  agent_results: Record<string, { name: string; role: string; result: string }>;
  consensus: {
    summary: string;
    contributor_count: number;
    synthesized_by: string;
    threat_level?: string;
    question_answer?: string;
    simulation?: {
      scenario?: string;
      forecast?: string;
      assumptions?: string[];
      confidence?: number;
    };
  };
}

export interface InvestigationPreviewResult {
  preview: {
    case_label: string;
    objective: string;
    structure_overview: string;
    top_level_keys: string[];
    entities: Array<{ name: string; type: string; reason: string }>;
    relationships: string[];
    timeline: string[];
    hypotheses: string[];
    assumptions: string[];
    gaps: string[];
    recommended_agents: string[];
    simulation_focus?: string;
    continue_prompt: string;
    ready_to_continue: boolean;
  };
  agent_results: Record<string, { name: string; role: string; result: string }>;
}

export interface AgentProfile {
  id: string;
  name: string;
  codename: string;
  title: string;
  category: string;
  role: string;
  personality: string;
  behavior: string;
  prompt: string;
  source_path: string;
}

export interface AssistantLLMSettings {
  provider: 'ollama' | 'openai' | 'anthropic' | 'openrouter';
  model: string;
  base_url: string;
  has_api_key: boolean;
}

export interface AssistantChatResult {
  reply: string;
  provider: string;
  model: string;
  skill_generated?: string | null;
  timestamp: number;
}

class ApiService {
  private ws: WebSocket | null = null;
  private wsCallbacks: Map<string, Set<(data: unknown) => void>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private agentProfilesCache: AgentProfile[] | null = null;

  // ── HTTP Methods ──

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    try {
      const resp = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`API error ${resp.status}: ${err}`);
      }
      return resp.json();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Failed to fetch')) {
        throw new Error('Backend not running. Start with: python -m backend.api.server');
      }
      throw e;
    }
  }

  async health(): Promise<{ status: string; engine: string; active_executions: number; swarm_agents: number }> {
    return this.request('/api/health');
  }

  async getNodeTypes(): Promise<{ node_types: Array<{ type: string; name: string; category: string; config: Record<string, unknown> }> }> {
    return this.request('/api/node-types');
  }

  async executeWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[], workflowId?: string): Promise<{ execution_id: string; status: string }> {
    return this.request('/api/workflow/execute', {
      method: 'POST',
      body: JSON.stringify({
        id: workflowId,
        name: 'Mipler Workflow',
        nodes,
        edges,
      }),
    });
  }

  async executeWorkflowSync(nodes: WorkflowNode[], edges: WorkflowEdge[], workflowId?: string): Promise<ExecutionStatus> {
    return this.request('/api/workflow/execute-sync', {
      method: 'POST',
      body: JSON.stringify({
        id: workflowId,
        name: 'Mipler Workflow',
        nodes,
        edges,
      }),
    });
  }

  async getExecution(executionId: string): Promise<ExecutionStatus> {
    return this.request(`/api/execution/${executionId}`);
  }

  async stopExecution(executionId: string): Promise<{ status: string }> {
    return this.request(`/api/execution/${executionId}/stop`, { method: 'POST' });
  }

  async runSwarm(
    task: string,
    agents: Array<{
      name: string;
      role?: string;
      personality?: string;
      behavior?: string;
      model?: string;
      internet_access?: boolean;
      response_style?: string;
      profile_name?: string;
    }> = [],
    strategy: string = 'parallel',
    data?: unknown,
    graphContext?: unknown,
  ): Promise<SwarmResult> {
    return this.request('/api/swarm/run', {
      method: 'POST',
      body: JSON.stringify({ task, agents, strategy, data, graph_context: graphContext }),
    });
  }

  async previewInvestigation(
    rawData: unknown,
    question: string,
    agents: string[] = [],
  ): Promise<{
    preview: {
      caseLabel: string;
      objective: string;
      structureOverview: string;
      topLevelKeys: string[];
      entities: Array<{ name: string; type: string; reason: string }>;
      relationships: string[];
      timeline: string[];
      hypotheses: string[];
      assumptions: string[];
      gaps: string[];
      recommendedAgents: string[];
      simulationFocus?: string;
      continuePrompt: string;
      readyToContinue: boolean;
    };
    agentResults: Record<string, { name: string; role: string; result: string }>;
  }> {
    const response = await this.request<InvestigationPreviewResult>('/api/investigation/preview', {
      method: 'POST',
      body: JSON.stringify({
        raw_data: rawData,
        question,
        agents,
      }),
    });

    return {
      preview: {
        caseLabel: response.preview.case_label,
        objective: response.preview.objective,
        structureOverview: response.preview.structure_overview,
        topLevelKeys: response.preview.top_level_keys || [],
        entities: response.preview.entities || [],
        relationships: response.preview.relationships || [],
        timeline: response.preview.timeline || [],
        hypotheses: response.preview.hypotheses || [],
        assumptions: response.preview.assumptions || [],
        gaps: response.preview.gaps || [],
        recommendedAgents: response.preview.recommended_agents || [],
        simulationFocus: response.preview.simulation_focus,
        continuePrompt: response.preview.continue_prompt,
        readyToContinue: response.preview.ready_to_continue,
      },
      agentResults: response.agent_results,
    };
  }

  async getAgentProfiles(forceRefresh = false): Promise<AgentProfile[]> {
    if (this.agentProfilesCache && !forceRefresh) {
      return this.agentProfilesCache;
    }

    const response = await this.request<{ profiles: AgentProfile[] }>('/api/agents/profiles');
    this.agentProfilesCache = response.profiles;
    return response.profiles;
  }

  async runOSINT(tool: string, target: string, params: Record<string, unknown> = {}): Promise<OSINTResult> {
    return this.request('/api/osint/run', {
      method: 'POST',
      body: JSON.stringify({ tool, target, params }),
    });
  }

  async getOSINTTools(): Promise<{ tools: Array<{ name: string; description: string }> }> {
    return this.request('/api/osint/tools');
  }

  async getAssistantLLMSettings(): Promise<AssistantLLMSettings> {
    return this.request('/api/assistant/llm-settings');
  }

  async setAssistantLLMSettings(payload: {
    provider: 'ollama' | 'openai' | 'anthropic' | 'openrouter';
    model: string;
    base_url: string;
    api_key: string;
  }): Promise<AssistantLLMSettings> {
    return this.request('/api/assistant/llm-settings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async assistantChat(payload: {
    user_id: string;
    session_id: string;
    message: string;
    complexity?: string;
  }): Promise<AssistantChatResult> {
    return this.request('/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async analyzeCase(payload: {
    user_id: string;
    session_id: string;
    case_text: string;
  }): Promise<{
    scenario_summary: string;
    clarifying_questions: string[];
    likely_entities: unknown[];
    risk_map: unknown[];
    next_best_actions: string[];
  }> {
    return this.request('/api/assistant/case/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createAssistantSchedule(payload: {
    user_id: string;
    name: string;
    prompt: string;
    daily_time_utc: string;
    destination?: string;
  }): Promise<Record<string, unknown>> {
    return this.request('/api/assistant/schedules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async factoryReset(): Promise<{ status: string; message: string }> {
    return this.request('/api/system/factory-reset', { method: 'POST' });
  }

  // ── WebSocket ──

  connectWs(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(`ws://127.0.0.1:8765/ws`);

      this.ws.onopen = () => {
        this.emit('ws_status', { connected: true });
        this.ws?.send(JSON.stringify({ type: 'ping' }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const eventType = data.type || 'unknown';
          this.emit(eventType, data);
          this.emit('all', data);
        } catch {
          // ignore parse errors
        }
      };

      this.ws.onclose = () => {
        this.emit('ws_status', { connected: false });
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.emit('ws_status', { connected: false });
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWs();
    }, 3000);
  }

  disconnectWs(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  on(event: string, callback: (data: unknown) => void): void {
    if (!this.wsCallbacks.has(event)) {
      this.wsCallbacks.set(event, new Set());
    }
    this.wsCallbacks.get(event)!.add(callback);
  }

  off(event: string, callback: (data: unknown) => void): void {
    this.wsCallbacks.get(event)?.delete(callback);
  }

  private emit(event: string, data: unknown): void {
    this.wsCallbacks.get(event)?.forEach(cb => {
      try { cb(data); } catch { /* ignore */ }
    });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const apiService = new ApiService();
