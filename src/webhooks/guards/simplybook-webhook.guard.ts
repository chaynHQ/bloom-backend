import { CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { simplybookWebhookSecret } from 'src/utils/constants';

export class SimplybookWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const rawToken = request.query.token;
    // Reject anything that isn't a single string (e.g. ?token=a&token=b parses as an array)
    const providedToken = typeof rawToken === 'string' ? rawToken : '';
    const expected = Buffer.from(simplybookWebhookSecret || '');
    const provided = Buffer.from(providedToken);

    if (
      !expected.length ||
      expected.length !== provided.length ||
      !timingSafeEqual(expected, provided)
    ) {
      throw new UnauthorizedException('Unauthorized: invalid webhook token');
    }

    return true;
  }
}
