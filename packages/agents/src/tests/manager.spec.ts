import { describe, it, expect } from 'vitest';
import { AgentRegistry } from '@nexa/agent-runtime';
import { Agent, AgentTask } from '@nexa/shared';
import { ManagerAgent } from '../manager/manager.agent';

function stubAgent(id: string, name: string): Agent {
  return {
    id,
    name,
    version: '1.0.0',
    capabilities: ['MANAGEMENT'],
    tools: [],
    permissions: [],
    inputSchema: {},
    outputSchema: {},
    plan: async () => {
      throw new Error('planning is not supported');
    },
    execute: async (task) => ({ taskId: task.id, success: true }),
    validate: async () => true
  };
}

function task(payload: any): AgentTask {
  return {
    id: 'task_manager_test',
    agentId: 'agent_manager_1',
    payload,
    state: 'CREATED',
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

describe('ManagerAgent plans', () => {
  it('uses a parsed LLM DAG and keeps planId equal to id', async () => {
    const registry = new AgentRegistry();
    registry.register(stubAgent('agent_market_research', 'Market Research Agent'));
    registry.register(stubAgent('agent_product_manager', 'Product Manager Agent'));

    const router = {
      async route() {
        return {
          content: JSON.stringify({
            id: 'plan_from_model',
            nodes: [
              {
                id: 'n1',
                name: 'Research',
                agentId: 'agent_market_research',
                dependencies: [],
                payload: { idea: 'widget' }
              },
              {
                id: 'n2',
                name: 'PRD',
                agentId: 'agent_product_manager',
                dependencies: ['n1'],
                payload: { idea: 'widget' }
              },
              {
                id: 'n3',
                name: 'Missing',
                agentId: 'agent_research_1',
                dependencies: [],
                payload: {}
              }
            ]
          }),
          model: 'openai/gpt-oss-120b',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }
        };
      }
    };

    const manager = new ManagerAgent(router as any, registry);
    const result = await manager.execute(task({ originalRequest: 'plan a business widget' }));

    expect(result.success).toBe(true);
    expect(result.data.id).toBe('plan_from_model');
    expect(result.data.planId).toBe(result.data.id);
    expect(result.data.nodes.map((node: any) => node.agentId)).toEqual([
      'agent_market_research',
      'agent_product_manager'
    ]);
    expect(result.data.planSource).toBe('llm');
    expect(JSON.stringify(result.data.nodes)).not.toContain('agent_research_1');
  });

  it('falls back to registered specialists when the model does not return a plan', async () => {
    const registry = new AgentRegistry();
    registry.register(stubAgent('agent_cv_optimizer', 'CV Optimizer'));
    registry.register(stubAgent('agent_application', 'Application Agent'));

    const router = {
      async route() {
        return {
          content: 'Business Analysis for the company: proceed.',
          model: 'deterministic-template-v1',
          usage: { promptTokens: 0, completionTokens: 1, totalTokens: 1 }
        };
      }
    };

    const manager = new ManagerAgent(router as any, registry);
    const result = await manager.execute(task({ originalRequest: 'apply to this job with my cv' }));

    expect(result.success).toBe(true);
    expect(result.data.planId).toBe(result.data.id);
    expect(result.data.planSource).toBe('registry-fallback');
    expect(result.data.nodes.map((node: any) => node.agentId)).toEqual([
      'agent_cv_optimizer',
      'agent_application'
    ]);
    expect(result.data.nodes[1].dependencies).toEqual(['node_1']);
  });
});
