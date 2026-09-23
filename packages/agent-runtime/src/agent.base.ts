import { Agent, AgentCapability, AgentResult, AgentTask, ExecutionPlan } from '@nexa/shared';

export abstract class BaseAgent implements Agent {
  abstract id: string;
  abstract name: string;
  abstract version: string;
  abstract capabilities: AgentCapability[];
  abstract tools: string[];
  abstract permissions: string[];
  abstract inputSchema: Record<string, any>;
  abstract outputSchema: Record<string, any>;

  /**
   * Plans the execution of an input into a DAG of tasks.
   * By default, returns a simple single-node plan or throws if planning is not supported.
   */
  async plan(input: any): Promise<ExecutionPlan> {
    throw new Error(`Agent ${this.name} (${this.id}) does not support planning.`);
  }

  /**
   * Executes a specific AgentTask.
   */
  abstract execute(task: AgentTask): Promise<AgentResult>;

  /**
   * Validates the result.
   */
  async validate(result: any): Promise<boolean> {
    // Default pass-through validation
    return true;
  }

  /**
   * Checks agent health and readiness.
   */
  async health(): Promise<{ status: 'HEALTHY' | 'DEGRADED' | 'DOWN'; message?: string }> {
    return { status: 'HEALTHY' };
  }
}
