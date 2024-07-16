import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { AUTH_GUARD_ERRORS, FIREBASE_ERRORS } from 'src/utils/errors';
import { AuthService } from '../auth/auth.service';
import { UserService } from '../user/user.service';
import { IFirebaseUser } from './firebase-user.interface';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger('FirebaseAuthGuard');

  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const { authorization } = request.headers;

    if (!authorization) {
      this.logger.warn({
        error: AUTH_GUARD_ERRORS.MISSING_HEADER,
        errorMessage: `FirebaseAuthGuard: Authorisation failed for ${request.originalUrl}`,
      });
      throw new UnauthorizedException('Unauthorized: missing required Authorization token');
    }

    let user;
    try {
      user = await this.authService.parseAuth(authorization);
    } catch (error) {
      if (error.code === 'auth/id-token-expired') {
        this.logger.warn({
          error: AUTH_GUARD_ERRORS.TOKEN_EXPIRED,
          errorMessage: `FireabaseAuthGuard: Authorisation failed for ${request.originalUrl}`,
          status: HttpStatus.UNAUTHORIZED,
        });
        throw new HttpException(FIREBASE_ERRORS.ID_TOKEN_EXPIRED, HttpStatus.UNAUTHORIZED);
      }
      this.logger.warn({
        error: AUTH_GUARD_ERRORS.PARSING_ERROR,
        errorMessage: `FirebaseAuthGuard: Authorisation failed for ${request.originalUrl}`,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });

      throw new HttpException(
        `FirebaseAuthGuard - Error parsing firebase user: ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      const { userEntity, userDto } = await this.userService.getUserByFirebaseId(
        user as IFirebaseUser,
      );
      request['user'] = userDto;
      request['userEntity'] = userEntity;
    } catch (error) {
      if (error.message === 'USER NOT FOUND') {
        this.logger.warn({
          error: AUTH_GUARD_ERRORS.USER_NOT_FOUND,
          errorMessage: `FirebaseAuthGuard: Authorisation failed for ${request.originalUrl}`,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
        throw new HttpException(
          `FirebaseAuthGuard - Firebase user exists but user no record in bloom database for ${user.email}: ${error}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        `FirebaseAuthGuard - Firebase user exists but error retrieving from bloom database for ${user.email}: ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return true;
  }
}
