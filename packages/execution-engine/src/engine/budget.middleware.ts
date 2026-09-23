export class BudgetExceededError extends Error {
  constructor(public readonly reason: string, public readonly details: any) {
    super(`Budget exceeded: ${reason}`);
    this.name = 'BudgetExceededError';
  }
}

export interface BudgetLimits {
  maxSteps?: number;
  maxLlmCalls?: number;
  maxCost?: number;
  maxRuntimeMs?: number;
}

export interface ExecutionBudgetState {
  stepsCount: number;
  llmCallsCount: number;
  costTotal: number;
  startTime: number;
}

export class BudgetMiddleware {
  constructor(private readonly dbClient?: any) {}

  /**
   * Asserts that current execution metrics do not exceed declared budget limits.
   * Throws BudgetExceededError if violated.
   */
  public assertWithinBudget(limits: BudgetLimits, state: ExecutionBudgetState): void {
    const elapsedMs = Date.now() - state.startTime;

    if (limits.maxRuntimeMs !== undefined && elapsedMs > limits.maxRuntimeMs) {
      throw new BudgetExceededError('Runtime limit exceeded', { elapsedMs, maxRuntimeMs: limits.maxRuntimeMs });
    }

    if (limits.maxSteps !== undefined && state.stepsCount > limits.maxSteps) {
      throw new BudgetExceededError('Step count exceeded', { stepsCount: state.stepsCount, maxSteps: limits.maxSteps });
    }

    if (limits.maxLlmCalls !== undefined && state.llmCallsCount > limits.maxLlmCalls) {
      throw new BudgetExceededError('LLM call limit exceeded', { llmCallsCount: state.llmCallsCount, maxLlmCalls: limits.maxLlmCalls });
    }

    if (limits.maxCost !== undefined && state.costTotal > limits.maxCost) {
      throw new BudgetExceededError('Cost threshold exceeded', { costTotal: state.costTotal, maxCost: limits.maxCost });
    }
  }

  /**
   * Wraps an execution unit, enforcing budget constraints and automatically marking the node FAILED in DB on violation.
   */
  public async wrapExecution<T>(
    nodeId: string,
    limits: BudgetLimits,
    state: ExecutionBudgetState,
    executionFn: () => Promise<T>
  ): Promise<T> {
    try {
      this.assertWithinBudget(limits, state);
      const result = await executionFn();
      this.assertWithinBudget(limits, state);
      return result;
    } catch (err: any) {
      if (err instanceof BudgetExceededError) {
        if (this.dbClient?.executionNode) {
          try {
            await this.dbClient.executionNode.update({
              where: { id: nodeId },
              data: { state: 'FAILED' }
            });
          } catch {
            // DB fallback
          }
        }
      }
      throw err;
    }
  }
}
