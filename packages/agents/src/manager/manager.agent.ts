import { AgentCapability, AgentResult, AgentTask, ExecutionPlan, ExecutionNode } from '@nexa/shared';
import { BaseAgent } from '@nexa/agent-runtime';
import { ModelRouter } from '@nexa/llm';

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
      planId: { type: 'string' },
      nodes: { type: 'array' }
    }
  };

  constructor(private readonly modelRouter: ModelRouter) {
    super();
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    try {
      const plan = await this.plan(task.payload);
      
      return {
        taskId: task.id,
        success: true,
        data: {
          planId: plan.id,
          nodes: plan.nodes
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
    const { originalRequest } = input;

    // Use REASONING tier to break down the task into a DAG
    const messages = [
      {
        role: 'system',
        content: 'You are the Nexa Manager Agent. Break down the user request into a DAG of execution nodes. Return JSON.'
      },
      {
        role: 'user',
        content: originalRequest
      }
    ];

    const response = await this.modelRouter.route('REASONING', messages);
    
    // Hardcoding a mock DAG plan for now
    // In reality, this would parse the LLM JSON response and validate against registered agents.
    
    const node1: ExecutionNode = {
      id: 'node_1',
      name: 'Initial Research',
      agentId: 'agent_research_1', // Requires Research capability
      dependencies: [],
      payload: { query: originalRequest },
      state: 'CREATED'
    };

    return {
      id: `plan_${Date.now()}`,
      taskId: 'internal_manager_task', // Will be overridden
      nodes: [node1]
    };
  }
}
