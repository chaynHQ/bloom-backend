import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { UserRepository } from '../user/user.repository';

@Injectable()
export class PartnerAdminAuthGuard implements CanActivate {
  constructor(private authService: AuthService, private usersRepository: UserRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { authorization } = request.headers;
    if (!authorization) {
      return false;
    }
    let userUid;

    try {
      const { uid } = await this.authService.parseAuth(authorization);
      userUid = uid;
    } catch (error) {
      if (error.code === 'auth/id-token-expired') {
        throw new HttpException(`PartnerAdminAuthGuard - ${error}`, HttpStatus.UNAUTHORIZED);
      }

      throw new HttpException(
        `PartnerAdminAuthGuard - Error parsing firebase user: ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    if (!userUid) {
      return false;
    }

    const user = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.partnerAdmin', 'partnerAdmin')
      .leftJoinAndSelect('partnerAdmin.partner', 'partner')
      .where('user.firebaseUid = :uid', { uid: userUid })
      .getOne();
    if (user.partnerAdmin?.partner == null) {
      return false;
    }

    request['partnerId'] = user.partnerAdmin.partner.id; // TODO is this the best way to be handling user details
    request['partnerAdminId'] = user.partnerAdmin.id;

    if (user.partnerAdmin.id) return true;
    return false;
  }
}
