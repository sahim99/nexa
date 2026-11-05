import { describe, expect, it } from 'vitest';
import { toExecutionPlan } from './plan-contract.js';

describe('toExecutionPlan', () => {
  it('accepts planId when id is absent', () => {
    const plan = toExecutionPlan(
      {
        planId: 'plan_abc',
        nodes: [{ id: 'node_1', name: 'Research', agentId: 'agent_market_research', dependencies: [], payload: {}, state: 'CREATED' }]
      },
      'task_db_1'
    );

    expect(plan.id).toBe('plan_abc');
    expect(plan.taskId).toBe('task_db_1');
    expect(plan.nodes).toHaveLength(1);
  });

  it('prefers id and rejects a result with no nodes', () => {
    const plan = toExecutionPlan({ id: 'plan_id', planId: 'other', nodes: [] }, 'task_db_2');
    expect(plan.id).toBe('plan_id');
    expect(() => toExecutionPlan({ planId: 'x' }, 'task')).toThrow(/nodes/);
    expect(() => toExecutionPlan({ nodes: [] }, 'task')).toThrow(/plan id/);
  });
});
