import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AgentModule } from './agent/agent.module.js';
import { DatabaseModule } from './database/database.module.js';
import { EventsModule } from './events/events.module.js';
import { ExecutionEngineModule } from './execution-engine/execution-engine.module.js';
import { ApprovalModule } from './approval/approval.module.js';
import { AuditModule } from './audit/audit.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { WorkflowsModule } from './workflows/workflows.module.js';
import { BusinessModule } from './business/business.module.js';

@Module({
  imports: [
    DatabaseModule,
    EventsModule,
    AgentModule,
    ExecutionEngineModule,
    ApprovalModule,
    AuditModule,
    JobsModule,
    WorkflowsModule,
    BusinessModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
