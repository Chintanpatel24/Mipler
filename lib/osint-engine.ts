// OSINT Workflow Execution Engine
import { getToolById } from './osint-tools';
import { Node, Edge } from 'reactflow';

export interface ExecutionResult {
  nodeId: string;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
}

export interface ExecutionContext {
  nodeResults: Map<string, any>;
  executedNodes: Set<string>;
}

export class OSINTEngine {
  private context: ExecutionContext = {
    nodeResults: new Map(),
    executedNodes: new Set(),
  };

  async executeWorkflow(
    nodes: Node[],
    edges: Edge[],
    startNodeId?: string
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    this.context = {
      nodeResults: new Map(),
      executedNodes: new Set(),
    };

    // Build dependency graph
    const dependencies = this.buildDependencyGraph(nodes, edges);

    // Execute nodes in order
    const nodesToExecute = startNodeId ? [startNodeId] : this.getStartNodes(nodes, edges);

    for (const nodeId of nodesToExecute) {
      const result = await this.executeNode(nodeId, nodes, edges, dependencies);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  private async executeNode(
    nodeId: string,
    nodes: Node[],
    edges: Edge[],
    dependencies: Map<string, string[]>
  ): Promise<ExecutionResult | null> {
    if (this.context.executedNodes.has(nodeId)) {
      return null;
    }

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) {
      return {
        nodeId,
        success: false,
        error: 'Node not found',
        duration: 0,
      };
    }

    const startTime = performance.now();

    try {
      // Execute dependencies first
      const deps = dependencies.get(nodeId) || [];
      for (const depId of deps) {
        if (!this.context.executedNodes.has(depId)) {
          await this.executeNode(depId, nodes, edges, dependencies);
        }
      }

      let result: any = null;

      if (node.type === 'input') {
        // Input node: return the input data
        result = {
          type: 'input',
          value: node.data?.value || '',
          label: node.data?.label,
        };
      } else if (node.type === 'tool') {
        // Tool node: execute the tool
        const tool = getToolById(node.data?.toolId);
        if (!tool) {
          throw new Error(`Tool not found: ${node.data?.toolId}`);
        }

        // Get input from connected nodes
        const inputEdge = edges.find((e) => e.target === nodeId);
        let input = '';

        if (inputEdge) {
          const sourceResult = this.context.nodeResults.get(inputEdge.source);
          if (sourceResult) {
            input = typeof sourceResult === 'string' ? sourceResult : JSON.stringify(sourceResult);
          }
        }

        if (!input) {
          throw new Error('No input data for tool');
        }

        // Execute the tool
        const toolResult = await tool.execute(input);
        result = toolResult;
      } else if (node.type === 'output') {
        // Output node: collect the result
        const inputEdge = edges.find((e) => e.target === nodeId);
        if (inputEdge) {
          result = this.context.nodeResults.get(inputEdge.source);
        }
      }

      this.context.nodeResults.set(nodeId, result);
      this.context.executedNodes.add(nodeId);

      const duration = performance.now() - startTime;

      return {
        nodeId,
        success: true,
        result,
        duration,
      };
    } catch (error: any) {
      const duration = performance.now() - startTime;

      return {
        nodeId,
        success: false,
        error: error.message,
        duration,
      };
    }
  }

  private buildDependencyGraph(nodes: Node[], edges: Edge[]): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();

    // Initialize all nodes
    nodes.forEach((node) => {
      dependencies.set(node.id, []);
    });

    // Add dependencies based on edges
    edges.forEach((edge) => {
      const deps = dependencies.get(edge.target) || [];
      deps.push(edge.source);
      dependencies.set(edge.target, deps);
    });

    return dependencies;
  }

  private getStartNodes(nodes: Node[], edges: Edge[]): string[] {
    // Find nodes with no incoming edges
    const nodesWithIncomingEdges = new Set<string>();
    edges.forEach((edge) => {
      nodesWithIncomingEdges.add(edge.target);
    });

    return nodes
      .filter(
        (node) =>
          node.type === 'input' ||
          (node.type === 'tool' && !nodesWithIncomingEdges.has(node.id))
      )
      .map((node) => node.id);
  }

  getResults(): Map<string, any> {
    return this.context.nodeResults;
  }

  getExecutedNodes(): Set<string> {
    return this.context.executedNodes;
  }
}

// Singleton instance
export const osintEngine = new OSINTEngine();
