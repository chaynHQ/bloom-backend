import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserEntity } from 'src/entities/user.entity';
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
  async createSessionUserRecord(
    @Req() req: Request,
    @Body() createSessionUserDto: CreateSessionUserDto,
  ) {
    return await this.sessionUserService.createSessionUser(
      req['user'] as UserEntity,
      createSessionUserDto,
    );
  }

  @Post(':sessionId')
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard)
  async updateSessionUserRecord(@Req() req: Request, @Param() params) {
    return await this.sessionUserService.updateSessionUser(
      req['user'] as UserEntity,
      params.sessionId,
    );
  }
}
