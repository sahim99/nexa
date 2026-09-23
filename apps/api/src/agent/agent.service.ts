import { Injectable, OnModuleInit } from '@nestjs/common';
import { AgentRegistry, TaskRunner } from '@nexa/agent-runtime';
import { InteractionAgent, ManagerAgent } from '@nexa/agents';
import { AgentTask } from '@nexa/shared';
import { PlanCompiler } from '@nexa/execution-engine';
import { DatabaseService } from '@nexa/database';
import * as crypto from 'crypto';

@Injectable()
export class AgentService implements OnModuleInit {
  constructor(
    private readonly registry: AgentRegistry,
    private readonly interactionAgent: InteractionAgent,
    private readonly managerAgent: ManagerAgent,
    private readonly taskRunner: TaskRunner,
    private readonly planCompiler: PlanCompiler,
    private readonly db: DatabaseService
  ) {}

  onModuleInit() {
    // Register core agents on startup
    this.registry.register(this.interactionAgent);
    this.registry.register(this.managerAgent);
    console.log('✅ Core agents registered in AgentRegistry.');
  }

  async interact(userInput: string) {
    // 1. Create a task for the Interaction Agent
    const interactionTask: AgentTask = {
      id: `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      agentId: this.interactionAgent.id,
      payload: { userInput },
      state: 'CREATED',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log(`[AgentService] Sending request to Interaction Agent: "${userInput}"`);

    // 2. Run the task through TaskRunner
    const interactionResult = await this.taskRunner.executeTask(interactionTask, {
      maxSteps: 5,
      maxLlmCalls: 2,
      maxCost: 0.05
    });

    if (!interactionResult.success) {
      throw new Error(`Interaction failed: ${interactionResult.error}`);
    }

    const intentData = interactionResult.data;

    // 3. If no clarification is needed and intent is EXECUTE_TASK, forward to Manager
    if (!intentData.clarificationNeeded && intentData.intent === 'EXECUTE_TASK') {
      console.log(`[AgentService] Interaction complete. Intent identified. Forwarding to Manager Agent.`);
      
      const managerTask: AgentTask = {
        id: `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        agentId: this.managerAgent.id,
        payload: intentData.forwardPayload,
        state: 'CREATED',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const managerResult = await this.taskRunner.executeTask(managerTask, {
        maxSteps: 10,
        maxLlmCalls: 5,
        maxCost: 0.50
      });

      if (!managerResult.success) {
        throw new Error(`Manager failed: ${managerResult.error}`);
      }

      const plan = managerResult.data;

      // 4. Create a root task in the DB to track this overall request
      const dbTask = await this.db.prisma.task.create({
        data: {
          description: userInput,
          state: 'RUNNING',
          budget: { maxSteps: 10, maxCost: 0.50 }
        }
      });

      // 5. Compile the plan into the DB, which kicks off the QueueWorker asynchronously
      await this.planCompiler.compile(dbTask.id, plan);

      return {
        interaction: interactionResult.data,
        planId: plan.id,
        taskId: dbTask.id,
        message: 'Plan compiled and execution engine started in the background.'
      };
    }

    // 4. Return the interaction response (e.g. clarification needed)
    return {
      interaction: interactionResult.data
    };
  }
}
