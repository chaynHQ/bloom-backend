import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { UserRepository } from '../user/user.repository';

@Injectable()
export class SuperAdminAuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    @InjectRepository(UserRepository) private usersRepository: UserRepository,
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
        throw new HttpException(`SuperAdminAuthGuard - ${error}`, HttpStatus.UNAUTHORIZED);
      }

      throw new HttpException(
        `SuperAdminAuthGuard - Error parsing firebase user: ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    try {
      const user = await this.usersRepository.findOneBy({ firebaseUid: userUid });

      return !!user.isSuperAdmin && user.email.indexOf('@chayn.co') !== -1;
    } catch (error) {
      throw new HttpException(
        `SuperAdminAuthGuard - Error finding user: ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
