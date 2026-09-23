import { describe, it, expect } from 'vitest';
import { BudgetMiddleware, BudgetExceededError } from '../engine/budget.middleware';

describe('BudgetMiddleware Enforcement', () => {
  it('throws BudgetExceededError and marks node FAILED when limits are breached', async () => {
    const mockDb = {
      executionNode: {
        updatedNodeState: '',
        async update({ where, data }: any) {
          this.updatedNodeState = data.state;
          return { id: where.id, state: data.state };
        }
      }
    };

    const middleware = new BudgetMiddleware(mockDb);

    const limits = {
      maxSteps: 5,
      maxLlmCalls: 2,
      maxRuntimeMs: 1000
    };

    // State exceeding LLM call limit
    const exceededState = {
      stepsCount: 3,
      llmCallsCount: 3, // exceeds limit 2
      costTotal: 0,
      startTime: Date.now()
    };

    let caughtError: any = null;
    try {
      await middleware.wrapExecution('node_123', limits, exceededState, async () => {
        return 'success';
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(BudgetExceededError);
    expect(caughtError.message).toContain('LLM call limit exceeded');
    expect(mockDb.executionNode.updatedNodeState).toBe('FAILED');
  });

  it('allows execution when metrics are strictly within declared budget', async () => {
    const middleware = new BudgetMiddleware();

    const limits = {
      maxSteps: 10,
      maxLlmCalls: 5,
      maxRuntimeMs: 5000
    };

    const validState = {
      stepsCount: 2,
      llmCallsCount: 1,
      costTotal: 0,
      startTime: Date.now()
    };

    const result = await middleware.wrapExecution('node_valid', limits, validState, async () => {
      return { completed: true };
    });

    expect(result.completed).toBe(true);
  });
});
