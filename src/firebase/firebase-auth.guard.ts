import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { UserService } from '../user/user.service';
import { IFirebaseUser } from './firebase-user.interface';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private authService: AuthService, private userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const { authorization } = request.headers;

    if (!authorization) {
      throw new UnauthorizedException('Unauthorized: missing required Authorization token');
    }

    const user = await this.authService.parseAuth(authorization);
    request['user'] = await this.userService.getUser(user as IFirebaseUser);

    return true;
  }
}
