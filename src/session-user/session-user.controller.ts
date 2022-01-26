import { Body, Controller, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { IFirebaseUser } from 'src/firebase/firebase-user.interface';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
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
  async createSessionUser(@Req() req: Request, @Body() createSessionUserDto: CreateSessionUserDto) {
    return await this.sessionUserService.createSessionUser(
      req['user'] as IFirebaseUser,
      createSessionUserDto,
    );
  }

  @Patch(':sessionId')
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard)
  async update(@Req() req: Request, @Param() params) {
    return await this.sessionUserService.completeSessionUser(
      req['user'] as IFirebaseUser,
      params.sessionId,
    );
  }
}
