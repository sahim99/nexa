import { Controller, Sse, MessageEvent, Req } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';

export const eventStream = new Subject<any>();

@Controller('events')
export class SseController {
  @Sse('stream')
  sse(@Req() req: any): Observable<MessageEvent> {
    return eventStream.asObservable().pipe(
      map(data => ({ data } as MessageEvent))
    );
  }
}
