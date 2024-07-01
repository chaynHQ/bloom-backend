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
import { AUTH_GUARD_ERRORS } from 'src/utils/errors';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class PartnerAdminAuthGuard implements CanActivate {
  private readonly logger = new Logger('SuperAdminAuthGuard');

  constructor(
    private authService: AuthService,
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { authorization } = request.headers;
    if (!authorization) {
      this.logger.warn({
        error: AUTH_GUARD_ERRORS.MISSING_HEADER,
        errorMessage: `PartnerAdminAuthGuard: Authorisation failed for ${request.originalUrl}`,
      });
      return false;
    }
    let userUid;

    try {
      const { uid } = await this.authService.parseAuth(authorization);
      userUid = uid;
    } catch (error) {
      if (error.code === 'auth/id-token-expired') {
        this.logger.warn({
          error: AUTH_GUARD_ERRORS.TOKEN_EXPIRED,
          errorMessage: `PartnerAdminAuthGuard: Authorisation failed for ${request.originalUrl}`,
        });
        throw new HttpException(AUTH_GUARD_ERRORS.TOKEN_EXPIRED, HttpStatus.UNAUTHORIZED);
      }

      this.logger.warn({
        error: AUTH_GUARD_ERRORS.PARSING_ERROR,
        errorMessage: `PartnerAdminAuthGuard: Authorisation failed for ${request.originalUrl}`,
      });

      throw new HttpException(
        `PartnerAdminAuthGuard - Error parsing firebase user: ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    if (!userUid) {
      return false;
    }

    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.partnerAdmin', 'partnerAdmin')
      .leftJoinAndSelect('partnerAdmin.partner', 'partner')
      .where('user.firebaseUid = :uid', { uid: userUid })
      .getOne();
    if (user.partnerAdmin?.partner == null || !user.partnerAdmin.active) {
      return false;
    }

    request['partnerId'] = user.partnerAdmin.partner.id; // TODO is this the best way to be handling user details
    request['partnerAdminId'] = user.partnerAdmin.id;
    request['userEntity'] = user;

    if (user.partnerAdmin.id) return true;
    return false;
  }
}
