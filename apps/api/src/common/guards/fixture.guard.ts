import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class FixtureModeGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isFixtureMode = process.env.NEXA_FIXTURE_MODE === 'true';
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && isFixtureMode) {
      throw new ForbiddenException('Fixture mode is strictly forbidden in production.');
    }

    return true;
  }
}
