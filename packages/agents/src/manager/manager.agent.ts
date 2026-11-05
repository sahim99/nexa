import { AgentCapability, AgentResult, AgentTask, ExecutionNode, ExecutionPlan } from '@nexa/shared';
import { AgentRegistry, BaseAgent } from '@nexa/agent-runtime';
import { ModelRouter } from '@nexa/llm';

const ORCHESTRATOR_IDS = new Set(['agent_manager_1', 'agent_interaction_1']);

export class ManagerAgent extends BaseAgent {
  id = 'agent_manager_1';
  name = 'Manager Agent';
  version = '1.0.0';
  capabilities: AgentCapability[] = ['MANAGEMENT'];
  tools: string[] = [];
  permissions: string[] = [];

  inputSchema = {
    type: 'object',
    properties: {
      originalRequest: { type: 'string' },
      context: { type: 'object' }
    },
    required: ['originalRequest']
  };

  outputSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      planId: { type: 'string' },
      taskId: { type: 'string' },
      nodes: { type: 'array' }
    }
  };

  constructor(
    private readonly modelRouter: ModelRouter,
    private readonly registry?: AgentRegistry
  ) {
    super();
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    try {
      const built = await this.buildPlan(task.payload, task.id);

      return {
        taskId: task.id,
        success: true,
        data: {
          id: built.plan.id,
          planId: built.plan.id,
          taskId: built.plan.taskId,
          nodes: built.plan.nodes,
          planSource: built.source
        },
        metadata: {
          model: built.model,
          planSource: built.source
        }
      };
    } catch (error: any) {
      return {
        taskId: task.id,
        success: false,
        error: error.message
      };
    }
  }

  async plan(input: any): Promise<ExecutionPlan> {
    const built = await this.buildPlan(input, input?.taskId);
    return built.plan;
  }

  private async buildPlan(
    input: any,
    taskId?: string
  ): Promise<{ plan: ExecutionPlan; source: 'llm' | 'registry-fallback'; model: string }> {
    const originalRequest = String(input?.originalRequest || input?.userInput || input?.query || '');
    const catalog = this.agentCatalog();

    let content = '';
    let model = 'unavailable';
    try {
      const response = await this.modelRouter.route('REASONING', [
        {
          role: 'system',
          content:
            'You are the Nexa Manager Agent. Break the user request into a DAG. ' +
            'Return JSON only with shape {"id": string, "nodes": [{"id": string, "name": string, "agentId": string, "dependencies": string[], "payload": object}]}. ' +
            `Use only these agentId values:\n${catalog || '(no specialists registered)'}`
        },
        { role: 'user', content: originalRequest }
      ]);
      content = response?.content || '';
      model = response?.model || model;
    } catch (err: any) {
      content = '';
      model = `error:${err?.message || 'route failed'}`;
    }

    const parsed = extractJsonObject(content);
    const fromModel = this.normalizeNodes(parsed?.nodes, originalRequest);
    const source: 'llm' | 'registry-fallback' = fromModel.length > 0 ? 'llm' : 'registry-fallback';
    const nodes = fromModel.length > 0 ? fromModel : this.fallbackNodes(originalRequest);
    const planId =
      (typeof parsed?.id === 'string' && parsed.id) ||
      (typeof parsed?.planId === 'string' && parsed.planId) ||
      `plan_${Date.now()}`;

    return {
      source,
      model,
      plan: {
        id: planId,
        taskId: taskId || input?.taskId || 'pending_task',
        nodes
      }
    };
  }

  private agentCatalog(): string {
    return this.specialists()
      .map((agent) => `${agent.id} (${agent.name}; capabilities: ${agent.capabilities.join(', ')})`)
      .join('\n');
  }

  private specialists() {
    if (!this.registry) return [];
    return this.registry.getAllAgents().filter((agent) => !ORCHESTRATOR_IDS.has(agent.id));
  }

  private normalizeNodes(rawNodes: unknown, originalRequest: string): ExecutionNode[] {
    if (!Array.isArray(rawNodes)) return [];

    const registered = new Set(this.specialists().map((agent) => agent.id));
    const enforceRegistry = !!this.registry;
    const accepted: ExecutionNode[] = [];

    rawNodes.forEach((node, index) => {
      if (!node || typeof node !== 'object') return;
      const record = node as Record<string, any>;
      const agentId = typeof record.agentId === 'string' ? record.agentId : '';
      if (!agentId || ORCHESTRATOR_IDS.has(agentId)) return;
      if (enforceRegistry && !registered.has(agentId)) return;

      accepted.push({
        id: typeof record.id === 'string' && record.id ? record.id : `node_${index + 1}`,
        name: typeof record.name === 'string' && record.name ? record.name : agentId,
        agentId,
        toolId: typeof record.toolId === 'string' ? record.toolId : undefined,
        dependencies: Array.isArray(record.dependencies)
          ? record.dependencies.filter((dep: unknown) => typeof dep === 'string')
          : [],
        payload: record.payload ?? { originalRequest, idea: originalRequest, query: originalRequest },
        state: 'CREATED'
      });
    });

    const ids = new Set(accepted.map((node) => node.id));
    for (const node of accepted) {
      node.dependencies = node.dependencies.filter((dep) => ids.has(dep) && dep !== node.id);
    }
    return accepted;
  }

  /**
   * Used only when the model does not return a usable DAG.
   * Nodes are limited to specialists actually registered in the process.
   */
  private fallbackNodes(originalRequest: string): ExecutionNode[] {
    const available = new Set(this.specialists().map((agent) => agent.id));
    if (available.size === 0) return [];

    const text = originalRequest.toLowerCase();
    let preferred: string[] = [];
    if (/business|startup|prd|launch|market|competitor/.test(text)) {
      preferred = ['agent_market_research', 'agent_product_manager', 'agent_business_plan', 'agent_launch'];
    } else if (/job|resume|cv|cover|apply|career|hiring/.test(text)) {
      preferred = ['agent_cv_optimizer', 'agent_application'];
    } else if (/telegram|email|outreach|message/.test(text)) {
      preferred = ['agent_telegram', 'agent_application'];
    } else {
      preferred = ['agent_market_research', 'agent_application', 'agent_self_repair'];
    }

    let chosen = preferred.filter((id) => available.has(id));
    if (chosen.length === 0) {
      chosen = Array.from(available).slice(0, 3);
    }

    return chosen.map((agentId, index) => ({
      id: `node_${index + 1}`,
      name: agentId,
      agentId,
      dependencies: index === 0 ? [] : [`node_${index}`],
      payload: {
        originalRequest,
        idea: originalRequest,
        query: originalRequest,
        message: originalRequest
      },
      state: 'CREATED' as const
    }));
  }
}

function extractJsonObject(content: string): Record<string, any> | null {
  if (!content) return null;
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : content;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}
