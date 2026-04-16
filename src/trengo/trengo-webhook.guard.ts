import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Logger } from 'src/logger/logger';
import { TrengoService } from './trengo.service';

const logger = new Logger('TrengoWebhookGuard');

@Injectable()
export class TrengoWebhookGuard implements CanActivate {
  constructor(private readonly trengoService: TrengoService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['trengo-signature'];
    const rawBody: Buffer = request.rawBody;

    if (!signature || !rawBody) {
      logger.warn('Trengo webhook rejected: missing signature or raw body');
      throw new UnauthorizedException('Missing webhook signature');
    }

    const isValid = this.trengoService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      logger.warn('Trengo webhook rejected: invalid signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
