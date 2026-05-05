import { CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { simplybookWebhookSecret } from 'src/utils/constants';

export class SimplybookWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedToken = (request.query.token as string) || '';
    const expected = Buffer.from(simplybookWebhookSecret || '');
    const provided = Buffer.from(providedToken);

    if (!expected.length || expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      throw new UnauthorizedException('Unauthorized: invalid webhook token');
    }

    return true;
  }
}
