import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Logger } from './logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private logger = new Logger('Interceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<void> {
    const req = context.switchToHttp().getRequest<Request>();

    //@ts-expect-error: userEntity is modified in authGuard
    const userId = req?.userEntity?.id;

    const commonMessage = `${req.method} "${req.originalUrl}" (IP address: ${req.ip}, requestUserId: ${userId})`;

    this.logger.log(`Started ${commonMessage}`);

    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logger.log(`Completed ${commonMessage} in ${Date.now() - now}ms`);
      }),
      catchError((err) => {
        this.logger.error(
          `Failed ${commonMessage} - status: ${err.status}, message: ${err.message} - in ${
            Date.now() - now
          }ms`,
        );
        return throwError(err);
      }),
    );
  }
}
