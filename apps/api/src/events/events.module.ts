import { Module, Global } from '@nestjs/common';
import { EventBus } from '@nexa/events';

@Global()
@Module({
  providers: [
    {
      provide: EventBus,
      useValue: new EventBus(),
    }
  ],
  exports: [EventBus],
})
export class EventsModule {}
