import { CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { zapierToken } from '../utils/constants';

export class ZapierAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const { authorization } = request.headers;

    if (!authorization) {
      throw new UnauthorizedException('Unauthorized: missing required Basic auth');
    }

    const providedToken = authorization.split('Basic ')[1] || '';
    const expected = Buffer.from(zapierToken);
    const provided = Buffer.from(providedToken);

    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      throw new UnauthorizedException('Unauthorized: invalid auth token');
    }

    return true;
  }
}
