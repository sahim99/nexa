import { Module } from '@nestjs/common';
import { SseController } from './sse.controller.js';
import { EventBus } from '@nexa/events';

@Module({
  controllers: [SseController],
  providers: [
    {
      provide: EventBus,
      useFactory: () => new EventBus(),
    },
  ],
  exports: [EventBus],
})
export class EventsModule {}
