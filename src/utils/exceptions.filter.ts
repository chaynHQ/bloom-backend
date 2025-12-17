import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from '../logger/logger';

@Catch()
export class ExceptionsFilter implements ExceptionFilter {
  private logger = new Logger('Interceptor');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const httpStatus =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception['response'].message || exception.message
        : 'Internal server error';

    response.status(httpStatus).json({
      statusCode: httpStatus,
      timestamp: new Date(),
      path: request.url,
      message,
    });
  }
}
