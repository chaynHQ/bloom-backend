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
    let userUid;
    try {
      const { uid } = await this.authService.parseAuth(authorization);
      userUid = uid;
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
    try {
      const user = await this.userRepository.findOneBy({ firebaseUid: userUid });
      request['userEntity'] = user;
      return !!user.isSuperAdmin && user.email.indexOf('@chayn.co') !== -1;
    } catch (error) {
      throw new HttpException(
        `SuperAdminAuthGuard - Error finding user: ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
