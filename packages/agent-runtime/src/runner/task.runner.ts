import { Agent, AgentTask, AgentResult, TaskState } from '@nexa/shared';
import { AgentRegistry } from '../registry/agent.registry';

export interface Budget {
  maxSteps: number;
  maxLlmCalls: number;
  maxCost: number;
}

export class TaskRunner {
  constructor(private readonly registry: AgentRegistry) {}

  /**
   * Executes a task using the assigned agent, enforcing budget constraints.
   */
  async executeTask(task: AgentTask, budget: Budget): Promise<AgentResult> {
    const agent = this.registry.getAgent(task.agentId);
    
    if (!agent) {
      return {
        taskId: task.id,
        success: false,
        error: `Agent with ID ${task.agentId} not found in registry.`
      };
    }

    try {
      // In a real implementation, budget enforcement would be wired up as middleware
      // to the tools and LLM gateway that the agent uses.
      // For now, we simulate execution.
      
      const result = await agent.execute(task);
      
      return result;
    } catch (error: any) {
      return {
        taskId: task.id,
        success: false,
        error: error.message || 'Unknown error occurred during task execution'
      };
    }
  }
}
