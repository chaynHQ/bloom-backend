import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { cancelBooking } from 'src/api/simplybook/simplybook-api';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { SIMPLYBOOK_ACTION_ENUM } from 'src/utils/constants';
import { Repository } from 'typeorm';

@Injectable()
export class TherapySessionService {
  private readonly logger = new Logger('TherapySessionService');

  constructor(
    @InjectRepository(TherapySessionEntity)
    private therapySessionRepository: Repository<TherapySessionEntity>,
    private readonly partnerAccessRepository: Repository<PartnerAccessEntity>,
    private readonly serviceUserProfilesService: ServiceUserProfilesService,
    private slackMessageClient: SlackMessageClient,
  ) {}

  async cancelTherapySession(therapySessionId: string): Promise<TherapySessionEntity> {
    try {
      const therapySession = await this.therapySessionRepository.findOne({
        where: { id: therapySessionId },
        relations: {
          partnerAccess: true,
          user: true,
        },
      });
      await cancelBooking(therapySession.bookingCode);

      therapySession.cancelledAt = new Date();

      const updatedTherapySession = await this.therapySessionRepository.save({
        ...therapySession,
        cancelledAt: new Date(),
        action: SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING,
      });

      await this.partnerAccessRepository.save({
        ...therapySession.partnerAccess,
        therapySessionsRemaining: therapySession.partnerAccess.therapySessionsRemaining + 1,
        therapySessionsRedeemed: therapySession.partnerAccess.therapySessionsRedeemed - 1,
      });

      const partnerAccesses = await this.partnerAccessRepository.find({
        where: {
          userId: therapySession.userId,
          active: true,
          featureTherapy: true,
        },
        relations: {
          therapySession: true,
        },
      });

      this.serviceUserProfilesService.updateServiceUserProfilesTherapy(
        partnerAccesses,
        therapySession.user.email,
      );

      return updatedTherapySession;
    } catch (error) {
      this.logger.error(`Error cancelling therapy session: ${error}`);
      throw new Error(`Error cancelling therapy session: ${error}`);
    }
  }

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

  async getUserTherapySessions(userId: string): Promise<TherapySessionEntity[]> {
    const therapySessions = await this.therapySessionRepository
      .createQueryBuilder('therapy_session')
      .select()
      .where('therapy_session.userId = :userId', { userId: userId })
      .getMany();

    return therapySessions;
  }
}
