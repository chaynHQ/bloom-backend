import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { UserRepository } from '../user/user.repository';

@Injectable()
export class SuperUserAuthGuard implements CanActivate {
  constructor(private authService: AuthService, private usersRepository: UserRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const { authorization } = request.headers;

    if (!authorization) {
      throw new UnauthorizedException('Unauthorized: missing required Authorization token');
    }

    const { uid } = await this.authService.parseAuth(authorization);

    const user = await this.usersRepository.findOne({ firebaseUid: uid });

    return !!user.isSuperAdmin;
  }
}
