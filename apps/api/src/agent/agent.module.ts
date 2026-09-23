import { Module, forwardRef } from '@nestjs/common';
import { AgentController } from './agent.controller.js';
import { AgentService } from './agent.service.js';
import { AgentRegistry, TaskRunner } from '@nexa/agent-runtime';
import { ModelRouter } from '@nexa/llm';
import { InteractionAgent, ManagerAgent } from '@nexa/agents';
import { ExecutionEngineModule } from '../execution-engine/execution-engine.module.js';

@Module({
  imports: [forwardRef(() => ExecutionEngineModule)],
  controllers: [AgentController],
  providers: [
    AgentService,
    // Provide the Registry
    {
      provide: AgentRegistry,
      useFactory: () => new AgentRegistry(),
    },
    // Provide ModelRouter (wraps LlmGateway)
    {
      provide: ModelRouter,
      useFactory: () => new ModelRouter(),
    },
    // Provide Core Agents
    {
      provide: InteractionAgent,
      useFactory: (modelRouter: ModelRouter) => new InteractionAgent(modelRouter),
      inject: [ModelRouter],
    },
    {
      provide: ManagerAgent,
      useFactory: (modelRouter: ModelRouter) => new ManagerAgent(modelRouter),
      inject: [ModelRouter],
    },
    // Provide Task Runner
    {
      provide: TaskRunner,
      useFactory: (registry: AgentRegistry) => new TaskRunner(registry),
      inject: [AgentRegistry],
    }
  ],
  exports: [AgentRegistry, TaskRunner, InteractionAgent, ManagerAgent]
})
export class AgentModule {}
