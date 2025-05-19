import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';
import { UserEntity } from 'src/entities/user.entity';
import { AUTH_GUARD_ERRORS, FIREBASE_ERRORS } from 'src/utils/errors';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class SuperAdminAuthGuard implements CanActivate {
  private readonly logger = new Logger('SuperAdminAuthGuard');

  constructor(
    private authService: AuthService,
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const { authorization } = request.headers;

    if (!authorization) {
      throw new HttpException(
        `SuperAdminAuthGuard: Unauthorised missing Authorization token`,
        HttpStatus.UNAUTHORIZED,
      );
    }

    let firebaseToken: DecodedIdToken;
    try {
      firebaseToken = await this.authService.parseAuth(authorization);
    } catch (error) {
      if (error.code === 'auth/id-token-expired') {
        this.logger.warn({
          error: AUTH_GUARD_ERRORS.TOKEN_EXPIRED,
          errorMessage: `Authorisation failed for ${request.originalUrl}`,
          status: HttpStatus.UNAUTHORIZED,
        });
        throw new HttpException(FIREBASE_ERRORS.ID_TOKEN_EXPIRED, HttpStatus.UNAUTHORIZED);
      }
      this.logger.warn({
        error: AUTH_GUARD_ERRORS.PARSING_ERROR,
        errorMessage: `Authorisation failed for ${request.originalUrl}`,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
      throw new HttpException(
        `SuperAdminAuthGuard - Error parsing firebase user: ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!firebaseToken.email_verified || !firebaseToken.firebase.sign_in_second_factor) {
      this.logger.warn({
        error: AUTH_GUARD_ERRORS.SUPERADMIN_2FA_REQUIRED,
        errorMessage: `user does not have 2FA enabled`,
        status: HttpStatus.UNAUTHORIZED,
      });
      throw new HttpException(
        `SuperAdminAuthGuard - user does not have 2FA enabled`,
        HttpStatus.UNAUTHORIZED,
      );
    }

    let user;
    try {
      user = await this.userRepository.findOneByOrFail({ firebaseUid: firebaseToken.uid });
      request['userEntity'] = user;
    } catch (error) {
      throw new HttpException(
        `SuperAdminAuthGuard - Error finding user: ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      if (!user.isSuperAdmin || !user.email.includes('@chayn.co')) {
        this.logger.warn({
          error: AUTH_GUARD_ERRORS.SUPERADMIN_UNAUTHORISED,
          errorMessage: `unauthorised user without superadmin access or chayn account`,
          status: HttpStatus.UNAUTHORIZED,
        });
        throw new HttpException(
          `SuperAdminAuthGuard - unauthorised user without superadmin access or chayn account`,
          HttpStatus.UNAUTHORIZED,
        );
      }
    } catch (error) {
      this.logger.error('Error checking superadmin access', error);
      throw new HttpException(
        `SuperAdminAuthGuard - error checking superadmin access: ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return true;
  }
}
