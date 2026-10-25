import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobProcessor } from './job.processor.js';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'jobs-queue',
    }),
  ],
  providers: [JobProcessor],
  exports: [BullModule],
})
export class QueueModule {}