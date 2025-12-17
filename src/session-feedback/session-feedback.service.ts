import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { SessionFeedbackEntity } from 'src/entities/session-feedback.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { Repository } from 'typeorm';
import { SessionService } from '../session/session.service';
import { SessionFeedbackDto } from './dtos/session-feedback.dto';

const logger = new Logger('SessionFeedbackService');

@Injectable()
export class SessionFeedbackService {
  constructor(
    @InjectRepository(SessionFeedbackEntity)
    private sessionFeedbackRepository: Repository<SessionFeedbackEntity>,
    private readonly sessionService: SessionService,
    private slackMessageClient: SlackMessageClient,
  ) {}

  public async createSessionFeedback(
    sessionFeedbackDto: SessionFeedbackDto,
  ): Promise<SessionFeedbackDto> {
    const session = await this.sessionService.getSessionAndCourse(sessionFeedbackDto.sessionId);

    if (!session) {
      throw new HttpException('SESSION NOT FOUND', HttpStatus.NOT_FOUND);
    }

    await this.sessionFeedbackRepository.save(sessionFeedbackDto);
    this.sendSlackSessionFeedback(sessionFeedbackDto, session);

    return sessionFeedbackDto;
  }
  // We don't need to wait for this to finish so async is not needed
  sendSlackSessionFeedback(sessionFeedbackDto: SessionFeedbackDto, session: SessionEntity) {
    try {
      this.slackMessageClient.sendMessageToBloomUserChannel(
        `*${session.name}* in *${session.course?.name}* was rated *_${sessionFeedbackDto.feedbackTags}_* ${sessionFeedbackDto.feedbackDescription.length > 0 ? `with the comment: \n> _${sessionFeedbackDto.feedbackDescription}_` : ''}`,
      );
    } catch (error) {
      logger.error(`Failed to send Slack message for session feedback: ${error.message}`);
    }
  }
}
