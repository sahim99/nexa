import { Module, OnModuleInit, OnModuleDestroy, forwardRef } from '@nestjs/common';
import { DatabaseService } from '@nexa/database';
import { EventBus } from '@nexa/events';
import { AgentRegistry } from '@nexa/agent-runtime';
import { PlanCompiler, DurableRunner, QueueWorker } from '@nexa/execution-engine';
import { AgentModule } from '../agent/agent.module.js';

@Module({
  imports: [forwardRef(() => AgentModule)], // To inject AgentRegistry
  providers: [
    {
      provide: PlanCompiler,
      useFactory: (db: DatabaseService) => new PlanCompiler(db),
      inject: [DatabaseService]
    },
    {
      provide: DurableRunner,
      useFactory: (db: DatabaseService, eventBus: EventBus, registry: AgentRegistry) => new DurableRunner(db, eventBus, registry),
      inject: [DatabaseService, EventBus, AgentRegistry]
    },
    {
      provide: QueueWorker,
      useFactory: (db: DatabaseService, runner: DurableRunner) => new QueueWorker(db, runner),
      inject: [DatabaseService, DurableRunner]
    }
  ],
  exports: [PlanCompiler, QueueWorker]
})
export class ExecutionEngineModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly queueWorker: QueueWorker) {}

  onModuleInit() {
    this.queueWorker.start();
  }

  onModuleDestroy() {
    this.queueWorker.stop();
  }
}
