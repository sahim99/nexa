import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
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
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [
    HealthModule,
    AuthModule,
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
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
