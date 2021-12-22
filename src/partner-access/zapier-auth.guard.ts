import { CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

export class ZapierAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const { authorization } = request.headers;

    if (!authorization) {
      throw new UnauthorizedException('Unauthorized: missing required Basic auth');
    }

    const zapierToken = authorization.split('Basic ')[1];

    if (zapierToken !== zapierToken) {
      throw new UnauthorizedException('Unauthorized: invalid auth token');
    }

    return true;
  }
}
