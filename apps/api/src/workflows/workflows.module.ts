import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller.js';

@Module({
  controllers: [WorkflowsController],
  exports: []
})
export class WorkflowsModule {}
