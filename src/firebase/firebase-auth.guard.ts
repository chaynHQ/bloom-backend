import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { UserService } from '../user/user.service';
import { IFirebaseUser } from './firebase-user.interface';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const { authorization } = request.headers;

    if (!authorization) {
      throw new UnauthorizedException('Unauthorized: missing required Authorization token');
    }

    let user;
    try {
      user = await this.authService.parseAuth(authorization);
    } catch (error) {
      if (error.code === 'auth/id-token-expired') {
        throw new HttpException(`FirebaseAuthGuard - ${error}`, HttpStatus.UNAUTHORIZED);
      }

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
