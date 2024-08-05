import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TherapySessionService {
  private readonly logger = new Logger('TherapySessionService');

  constructor(
    @InjectRepository(TherapySessionEntity)
    private therapySessionRepository: Repository<TherapySessionEntity>,
    private slackMessageClient: SlackMessageClient,
  ) {}

  async softDeleteTherapySessions(
    userId,
    userEmail,
    randomString,
  ): Promise<TherapySessionEntity[]> {
    // getTherapySessions for userId and Email
    const therapySessions = await this.therapySessionRepository
      .createQueryBuilder('therapy_session')
      .select()
      .where('therapy_session.clientEmail = :email', { email: userEmail })
      .orWhere('therapy_session.userId = :userId', {
        userId: userId,
      })
      .getMany();

    const emails = therapySessions
      .map((ts) => ts.clientEmail)
      .filter((email, index, emailArr) => {
        return emailArr.indexOf(email) === index;
      });

    await this.slackMessageClient.sendMessageToTherapySlackChannel(
      `User has been deleted from bloom - please remove the accounts associated with ${userEmail + emails.join(', ')} from Simplybook, Crisp and from Mailchimp`,
    );

    // redact email from therapy sessions
    const redactedTherapySessions: TherapySessionEntity[] = await Promise.all(
      therapySessions.map(async (ts): Promise<TherapySessionEntity> => {
        const updates = {
          ...ts,
          clientEmail: randomString,
        };
        const updatedTherapySession = (await this.therapySessionRepository.save(
          updates,
        )) as TherapySessionEntity;
        return updatedTherapySession;
      }),
    );
    this.logger.log(
      `Redacted ${redactedTherapySessions.length} therapy sessions for user  + ${userId}`,
    );

    return redactedTherapySessions;
  }
}
