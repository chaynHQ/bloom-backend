import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { GetUserDto } from 'src/user/dtos/get-user.dto';
import { ControllerDecorator } from 'src/utils/controller.decorator';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { UpdateSessionUserDto } from './dtos/update-session-user.dto';
import { SessionUserService } from './session-user.service';

@ApiTags('Session User')
@ControllerDecorator()
@Controller('/v1/session-user')
export class SessionUserController {
  constructor(private readonly sessionUserService: SessionUserService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard)
  async createSessionUser(@Req() req: Request, @Body() createSessionUserDto: UpdateSessionUserDto) {
    return await this.sessionUserService.createSessionUser(
      req['user'] as GetUserDto,
      createSessionUserDto,
    );
  }

  @Post('/complete')
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard)
  async update(@Req() req: Request, @Body() completeSessionUserDto: UpdateSessionUserDto) {
    return await this.sessionUserService.completeSessionUser(
      req['user'] as GetUserDto,
      completeSessionUserDto,
    );
  }
}
