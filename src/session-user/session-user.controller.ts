import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserEntity } from '../entities/user.entity';
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
  @ApiBearerAuth('access-token')
  @ApiOperation({
    description:
      'Stores relationship between a `User` and `Session` records, once a user has started a session.',
  })
  @UseGuards(FirebaseAuthGuard)
  async createSessionUser(@Req() req: Request, @Body() createSessionUserDto: UpdateSessionUserDto) {
    return await this.sessionUserService.createSessionUser(
      req['userEntity'] as UserEntity,
      createSessionUserDto,
    );
  }

  @Post('/complete')
  @ApiOperation({
    description: 'Updates a users sessions progress to completed',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(FirebaseAuthGuard)
  async complete(@Req() req: Request, @Body() updateSessionUserDto: UpdateSessionUserDto) {
    return await this.sessionUserService.setSessionUserCompleted(
      req['userEntity'] as UserEntity,
      updateSessionUserDto,
      true,
    );
  }

  @Post('/incomplete')
  @ApiOperation({
    description:
      'Updates a users sessions progress to incomplete, undoing a previous complete action',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(FirebaseAuthGuard)
  async incomplete(@Req() req: Request, @Body() updateSessionUserDto: UpdateSessionUserDto) {
    return await this.sessionUserService.setSessionUserCompleted(
      req['userEntity'] as UserEntity,
      updateSessionUserDto,
      false,
    );
  }
}
