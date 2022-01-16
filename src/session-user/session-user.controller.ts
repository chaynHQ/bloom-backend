import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { ControllerDecorator } from '../utils/controller.decorator';
import { CreateSessionUserDto } from './dtos/create-session-user.dto';
import { SessionUserService } from './session-user.service';
import { Request } from 'express';

@ApiTags('Session User')
@ControllerDecorator()
@Controller('session-user')
export class SessionUserController {
  constructor(private readonly sessionUserService: SessionUserService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard)
  async createSessionUserRecord(
    @Body() createSessionUserDto: CreateSessionUserDto,
    @Req() res: Request,
  ) {
    return '';
  }
}
