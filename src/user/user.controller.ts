import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { IFirebaseUser } from '../firebase/firebase-user.interface';
import { UserService } from './user.service';
import { Request } from 'express';
import { ApiTags, ApiConsumes, ApiProduces, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GetUserDto } from './dto/get-user.dto';

@ApiTags('Users')
@ApiConsumes('application/json')
@ApiProduces('application/json')
@ApiResponse({ status: 201, description: 'The record has been successfully created.' })
@ApiResponse({ status: 400, description: 'Incorrect payload sent.' })
@ApiResponse({ status: 401, description: 'Unauthorized.' })
@ApiResponse({ status: 403, description: 'Forbidden.' })
@ApiResponse({ status: 500, description: 'Internal Server Error.' })
@Controller('/v1/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiBearerAuth()
  @Post('/me')
  @UseGuards(FirebaseAuthGuard)
  async getUser(@Req() req: Request): Promise<GetUserDto> {
    return this.userService.getUser(req['user'] as IFirebaseUser);
  }
}
