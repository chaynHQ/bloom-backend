import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { ControllerDecorator } from 'src/utils/controller.decorator';
import { UserEntity } from '../entities/user.entity';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { TherapySessionService } from './therapy-session.service';

@ApiTags('Therapy Session')
@ControllerDecorator()
@Controller('/v1/therapy-session')
export class TherapySessionController {
  constructor(private readonly therapySessionService: TherapySessionService) {}

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    description: 'Returns user therapy sessions data.',
  })
  @UseGuards(FirebaseAuthGuard)
  async getCourseUserByUserId(@Req() req: Request): Promise<TherapySessionEntity[]> {
    const user = req['userEntity'] as UserEntity;
    const therapySessions = await this.therapySessionService.getUserTherapySessions(user.id);
    return therapySessions;
  }
}
