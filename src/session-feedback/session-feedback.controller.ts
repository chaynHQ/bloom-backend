import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ControllerDecorator } from 'src/utils/controller.decorator';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { SessionFeedbackDto } from './dtos/session-feedback.dto';
import { SessionFeedbackService } from './session-feedback.service';

@ApiTags('Session Feedback')
@ControllerDecorator()
@Controller('/v1/session-feedback')
export class SessionFeedbackController {
  constructor(private readonly sessionFeedbackService: SessionFeedbackService) {}

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    description: 'Stores feedback from a user',
  })
  @UseGuards(FirebaseAuthGuard)
  async storeUserFeedback(
    @Body() sessionFeedbackDto: SessionFeedbackDto,
  ): Promise<SessionFeedbackDto> {
    return await this.sessionFeedbackService.createSessionFeedback(sessionFeedbackDto);
  }
}
