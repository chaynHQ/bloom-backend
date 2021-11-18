import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from 'src/firebase/firebase-auth.guard';
import { IFirebaseUser } from 'src/interfaces/firebase-user.interface';
import { UserService } from './user.service';
import { Request } from 'express';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/me')
  @UseGuards(FirebaseAuthGuard)
  async getUser(@Req() req: Request) {
    return this.userService.getUser(req['user'] as IFirebaseUser);
  }
}
