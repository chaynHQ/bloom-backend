import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
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
      throw new UnauthorizedException('Unauthorized: missing required Authorization token');
    }

    const { uid } = await this.authService.parseAuth(authorization);

    const user = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.partnerAdmin', 'partnerAdmin')
      .leftJoinAndSelect('partnerAdmin.partner', 'partner')
      .where('user.firebaseUid = :uid', { uid })
      .getOne();

    request['partnerId'] = user.partnerAdmin.partner.id;
    request['partnerAdminId'] = user.partnerAdmin.id;

    return true;
  }
}
