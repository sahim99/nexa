import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [BusinessController],
  exports: []
})
export class BusinessModule {}
