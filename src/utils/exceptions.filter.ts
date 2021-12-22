import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from '../logger/logger';
import { isProduction } from './constants';

@Catch()
export class ExceptionsFilter implements ExceptionFilter {
  private logger = new Logger('Interceptor');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const now = Date.now();

    const httpStatus =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception['response'].message || exception.message
        : 'Internal server error';

    if (isProduction) {
      this.logger.error(
        `Failed ${request.url} - status: ${httpStatus}, message: ${message} - in ${
          Date.now() - now
        }ms`,
      );
    }

    response.status(httpStatus).json({
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
