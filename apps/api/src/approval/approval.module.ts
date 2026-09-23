import { Module } from '@nestjs/common';
import { DatabaseService } from '@nexa/database';
import { EventBus } from '@nexa/events';
import { ApprovalService } from '@nexa/approvals';
import { ApprovalController } from './approval.controller.js';

@Module({
  controllers: [ApprovalController],
  providers: [
    {
      provide: ApprovalService,
      useFactory: (db: DatabaseService, eventBus: EventBus) => new ApprovalService(db, eventBus),
      inject: [DatabaseService, EventBus]
    }
  ],
  exports: [ApprovalService]
})
export class ApprovalModule {}
