import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { IFirebaseUser } from '../firebase/firebase-user.interface';
import { ControllerDecorator } from '../utils/controller.decorator';
import { CreateSessionUserDto } from './dtos/create-session-user.dto';
import { SessionUserService } from './session-user.service';

@ApiTags('Session User')
@ControllerDecorator()
@Controller('/v1/session-user')
export class SessionUserController {
  constructor(private readonly sessionUserService: SessionUserService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard)
  async createSessionUserRecord(
    @Req() req: Request,
    @Body() createSessionUserDto: CreateSessionUserDto,
  ) {
    return await this.sessionUserService.createSessionUser(
      req['user'] as IFirebaseUser,
      createSessionUserDto,
    );
  }
}
