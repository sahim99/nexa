import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller('healthz')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

@Controller('readyz')
export class ReadyController {
  @Public()
  @Get()
  check() {
    return { status: 'ready', timestamp: new Date().toISOString() };
  }
}
