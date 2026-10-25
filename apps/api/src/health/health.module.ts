import { Module } from '@nestjs/common';
import { HealthController, ReadyController } from './health.controller.js';

@Module({
  controllers: [HealthController, ReadyController],
})
export class HealthModule {}
