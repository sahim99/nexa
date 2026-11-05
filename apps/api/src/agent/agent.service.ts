import { Injectable, OnModuleInit } from '@nestjs/common';
import { AgentRegistry, TaskRunner } from '@nexa/agent-runtime';
import {
  ApplicationAgent,
  BusinessPlanAgent,
  CvOptimizerAgent,
  InteractionAgent,
  LaunchAgent,
  ManagerAgent,
  MarketResearchAgent,
  ProductManagerAgent,
  SelfRepairAgent,
  TelegramAgent
} from '@nexa/agents';
import { Agent, AgentTask } from '@nexa/shared';
import { toExecutionPlan } from './plan-contract.js';
import { PlanCompiler } from '@nexa/execution-engine';
import { DatabaseService } from '@nexa/database';

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
    this.registerIfAbsent(this.interactionAgent);
    this.registerIfAbsent(this.managerAgent);

    const specialists: Agent[] = [
      new CvOptimizerAgent(),
      new ApplicationAgent(),
      new TelegramAgent(),
      new MarketResearchAgent(),
      new ProductManagerAgent(),
      new BusinessPlanAgent(),
      new LaunchAgent(),
      new SelfRepairAgent()
    ];
    for (const agent of specialists) {
      this.registerIfAbsent(agent);
    }

    console.log(`✅ Registered ${this.registry.getAllAgents().length} agents in AgentRegistry.`);
  }

  private registerIfAbsent(agent: Agent) {
    if (!this.registry.get(agent.id)) {
      this.registry.register(agent);
    }
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

      const drafted = toExecutionPlan(managerResult.data, 'pending');

      try {
        // 4. Create a root task in the DB to track this overall request
        const dbTask = await this.db.prisma.task.create({
          data: {
            description: userInput,
            state: 'RUNNING',
            budget: { maxSteps: 10, maxCost: 0.50 }
          }
        });

        const plan = toExecutionPlan(managerResult.data, dbTask.id);
        await this.planCompiler.compile(dbTask.id, plan);

        return {
          interaction: interactionResult.data,
          planId: plan.id,
          taskId: dbTask.id,
          nodes: plan.nodes,
          persisted: true,
          message: 'Plan compiled and execution engine started in the background.'
        };
      } catch (err: any) {
        if (!isDatabaseUnavailable(err)) {
          throw err;
        }
        return {
          interaction: interactionResult.data,
          planId: drafted.id,
          taskId: null,
          nodes: drafted.nodes,
          persisted: false,
          message: 'Plan was created but not stored. Postgres is not reachable.'
        };
      }
    }

    // 4. Return the interaction response (e.g. clarification needed)
    return {
      interaction: interactionResult.data
    };
  }

  listAgents() {
    return this.registry.getAllAgents().map((agent) => ({
      id: agent.id,
      name: agent.name,
      capabilities: agent.capabilities,
      lane: laneForAgent(agent.id),
      status: 'IDLE' as const,
      type: algorithmAgents.has(agent.id) ? ('ALGORITHM' as const) : ('LLM' as const),
      lastActivity: 'Registered in this process. No task history is stored yet.',
      tasksCompleted: 0
    }));
  }
}

function isDatabaseUnavailable(err: any): boolean {
  const message = String(err?.message || '');
  return (
    err?.errorCode === 'P1001' ||
    message.includes("Can't reach database") ||
    message.includes('DATABASE_URL')
  );
}

const algorithmAgents = new Set(['agent_cv_optimizer', 'agent_self_repair']);

function laneForAgent(id: string): 'DISCOVERY' | 'ENRICHMENT' | 'DECISION' | 'APPLICATION' | 'OUTREACH' | 'COMPLETED' {
  switch (id) {
    case 'agent_market_research':
      return 'DISCOVERY';
    case 'agent_cv_optimizer':
      return 'ENRICHMENT';
    case 'agent_application':
      return 'APPLICATION';
    case 'agent_telegram':
    case 'agent_launch':
      return 'OUTREACH';
    case 'agent_self_repair':
      return 'COMPLETED';
    default:
      return 'DECISION';
  }
}
