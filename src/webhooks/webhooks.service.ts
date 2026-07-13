import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISbStoryData } from '@storyblok/js';
import { createHmac, timingSafeEqual } from 'crypto';
import apiCall from 'src/api/apiCalls';
import { getBookingDetails } from 'src/api/simplybook/simplybook-api';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { ChatUserService } from 'src/chat-user/chat-user.service';
import { CourseEntity } from 'src/entities/course.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { ResourceEntity } from 'src/entities/resource.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { UNREAD_NOTIFICATION_STATUS } from 'src/front-chat/front-chat.interface';
import { Logger } from 'src/logger/logger';
import { SimplybookBodyDto } from 'src/partner-access/dtos/simplybook-body.dto';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { IUser } from 'src/user/user.interface';
import { partiallyMaskEmail } from 'src/utils/pii-redaction';
import { serializeSimplybookDtoToTherapySessionEntity } from 'src/utils/serialize';
import { ILike, MoreThan, Repository } from 'typeorm';
import { CoursePartnerService } from '../course-partner/course-partner.service';
import {
  isProduction,
  mailchimpWebhookSecret,
  RESOURCE_CATEGORIES,
  SIMPLYBOOK_ACTION_ENUM,
  simplybookCompanyName,
  STORYBLOK_PAGE_COMPONENTS,
  STORYBLOK_STORY_STATUS_ENUM,
  storyblokToken,
  storyblokWebhookSecret,
  THEMES,
} from '../utils/constants';
import { MailchimpWebhookDto } from './dto/mailchimp-webhook.dto';
import { SimplybookNotificationType, SimplybookWebhookDto } from './dto/simplybook-webhook.dto';
import { StoryWebhookDto } from './dto/story.dto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger('WebhooksService');

  constructor(
    @InjectRepository(PartnerAccessEntity)
    private partnerAccessRepository: Repository<PartnerAccessEntity>,
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
    @InjectRepository(CourseEntity) private courseRepository: Repository<CourseEntity>,
    @InjectRepository(SessionEntity) private sessionRepository: Repository<SessionEntity>,
    @InjectRepository(ResourceEntity) private resourceRepository: Repository<ResourceEntity>,
    private readonly coursePartnerService: CoursePartnerService,
    @InjectRepository(TherapySessionEntity)
    private therapySessionRepository: Repository<TherapySessionEntity>,
    private serviceUserProfilesService: ServiceUserProfilesService,
    private slackMessageClient: SlackMessageClient,
    private readonly chatUserService: ChatUserService,
  ) {}

  async updatePartnerAccessTherapy(
    simplyBookDto: SimplybookBodyDto,
  ): Promise<TherapySessionEntity> {
    const { action, booking_code, user_id, client_email } = simplyBookDto;

    this.logger.log(
      `Update therapy session webhook function STARTED for ${action} - booking_code ${booking_code} - userId ${user_id}`,
    );

    // Retrieve existing therapy session record for this booking
    const existingTherapySession = await this.therapySessionRepository.findOneBy({
      clientEmail: ILike(client_email),
      bookingCode: ILike(booking_code),
    });

    if (action !== SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING && !existingTherapySession) {
      const error = `UpdatePartnerAccessTherapy - existing therapy session not found for ${action} action, booking_code ${booking_code}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }

    if (action === SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING && existingTherapySession && isProduction) {
      const error = `UpdatePartnerAccessTherapy - therapy session already exists for booking code ${booking_code}, preventing duplicate NEW_BOOKING action`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.FOUND);
    }

    const userId = user_id || existingTherapySession?.userId;
    const user = await this.getSimplyBookTherapyUser(userId, client_email);

    // Creating a new therapy session
    if (action === SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING) {
      const therapySession = await this.newPartnerAccessTherapy(user, simplyBookDto);

      this.logger.log(
        `Update therapy session webhook function COMPLETED for ${action} - booking_code ${booking_code} - userId ${user_id}`,
      );
      return therapySession;
    }

    // Updating an existing therapy session
    existingTherapySession.action = action;

    // Reconcile bookingId. The lookup uses clientEmail + bookingCode, so a mismatched
    // bookingId means we matched the wrong record (or Simplybook reused a code) — bail
    // out rather than silently overwrite and risk corrupting accounting. Simplybook will
    // retry the webhook, so we Slack-alert to surface it for manual investigation rather
    // than letting 409s pile up silently.
    if (simplyBookDto.booking_id !== undefined) {
      if (existingTherapySession.bookingId == null) {
        existingTherapySession.bookingId = simplyBookDto.booking_id;
      } else if (existingTherapySession.bookingId !== simplyBookDto.booking_id) {
        const error = `UpdatePartnerAccessTherapy - bookingId mismatch for booking_code ${booking_code}: existing ${existingTherapySession.bookingId}, incoming ${simplyBookDto.booking_id}`;
        this.logger.error(error);
        await this.slackMessageClient.sendMessageToTherapySlackChannel(
          `Simplybook webhook bookingId mismatch 🚨 booking_code ${booking_code}: local record has bookingId ${existingTherapySession.bookingId}, webhook claims ${simplyBookDto.booking_id}. Manual investigation required.`,
        );
        throw new HttpException(error, HttpStatus.CONFLICT);
      }
    }

    // If the booking is cancelled, credit the session back to the partner access counters.
    // Guard against duplicate webhook deliveries: only credit back once (existing cancelledAt
    // means we've already processed a cancel for this record).
    // Atomic UPDATE statements (increment/decrement) avoid lost-update races if two cancel
    // webhooks for different bookings on the same partnerAccess arrive concurrently.
    if (
      action === SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING &&
      !existingTherapySession.cancelledAt
    ) {
      try {
        await this.partnerAccessRepository.increment(
          { id: existingTherapySession.partnerAccessId },
          'therapySessionsRemaining',
          1,
        );
        await this.partnerAccessRepository.decrement(
          { id: existingTherapySession.partnerAccessId },
          'therapySessionsRedeemed',
          1,
        );
        existingTherapySession.cancelledAt = new Date();
      } catch (err) {
        const error = `UpdatePartnerAccessTherapy - error updating partner access for ${action} - userId ${user.id} - ${err?.message || 'unknown error'}`;
        this.logger.error(error);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    if (action === SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING) {
      existingTherapySession.rescheduledFrom = existingTherapySession.startDateTime;
      existingTherapySession.startDateTime = new Date(simplyBookDto.start_date_time);
      existingTherapySession.endDateTime = new Date(simplyBookDto.end_date_time);
    }

    try {
      const therapySession = await this.therapySessionRepository.save(existingTherapySession);

      const partnerAccesses = await this.partnerAccessRepository.find({
        where: {
          userId: user.id,
          active: true,
          featureTherapy: true,
        },
        relations: {
          therapySession: true,
        },
      });

      this.serviceUserProfilesService.updateServiceUserProfilesTherapy(partnerAccesses, user.email);

      await this.notifyTherapyChannelOfBooking(action, therapySession, user.email, user.id);

      this.logger.log(
        `Update therapy session webhook function COMPLETED for ${action} - booking_code ${booking_code} - userId ${user_id}`,
      );
      return therapySession;
    } catch (err) {
      const error = `UpdatePartnerAccessTherapy - error updating therapy session for ${action} - userId ${user.id} - ${err?.message || 'unknown error'}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleSimplybookWebhook(
    webhookDto: SimplybookWebhookDto,
  ): Promise<TherapySessionEntity | void> {
    if (webhookDto.company !== simplybookCompanyName) {
      const error = `Simplybook webhook received for unexpected company ${webhookDto.company}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.UNAUTHORIZED);
    }

    // Replay protection: reject webhooks outside a 5-minute window. Defends against an
    // attacker who has captured a webhook URL with token replaying old payloads to
    // re-trigger booking processing.
    const replayWindowMs = 5 * 60 * 1000;
    if (webhookDto.webhook_timestamp !== undefined) {
      const ageMs = Date.now() - webhookDto.webhook_timestamp * 1000;
      if (ageMs > replayWindowMs || ageMs < -replayWindowMs) {
        const error = `Simplybook webhook rejected: timestamp ${webhookDto.webhook_timestamp} outside ${replayWindowMs}ms replay window (age ${ageMs}ms)`;
        this.logger.warn(error);
        throw new HttpException(error, HttpStatus.UNAUTHORIZED);
      }
    } else {
      this.logger.warn(
        `Simplybook webhook for booking ${webhookDto.booking_id} arrived without webhook_timestamp — replay window not enforced`,
      );
    }

    if (webhookDto.notification_type === SimplybookNotificationType.NOTIFY) {
      this.logger.log(
        `Simplybook reminder webhook received for booking ${webhookDto.booking_id} - ignoring`,
      );
      return;
    }

    const notificationTypeToAction: Record<
      Exclude<SimplybookNotificationType, SimplybookNotificationType.NOTIFY>,
      SIMPLYBOOK_ACTION_ENUM
    > = {
      [SimplybookNotificationType.CREATE]: SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING,
      [SimplybookNotificationType.CANCEL]: SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING,
      [SimplybookNotificationType.CHANGE]: SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING,
    };

    const action = notificationTypeToAction[webhookDto.notification_type];
    const bookingDetails = await getBookingDetails(webhookDto.booking_id);

    // user_id is sourced from a Simplybook intake field. It is currently unset in production
    // because the field is "not visible" in admin, so Simplybook drops it from submissions.
    // updatePartnerAccessTherapy falls back to client_email lookup when userId is undefined.
    const userId =
      bookingDetails.additional_fields.find((f) => f.field_name === 'user_id')?.value || undefined;

    const internalDto: SimplybookBodyDto = {
      action,
      booking_id: webhookDto.booking_id,
      booking_code: bookingDetails.code,
      client_email: bookingDetails.client.email,
      service_name: bookingDetails.service.name,
      service_provider_name: bookingDetails.provider.name,
      service_provider_email: bookingDetails.provider.email,
      start_date_time: bookingDetails.start_datetime,
      end_date_time: bookingDetails.end_datetime,
      user_id: userId,
    };

    return this.updatePartnerAccessTherapy(internalDto);
  }

  // Sends an informational Slack message for booking lifecycle events (new/update/cancel).
  // User email is partially masked so the channel contains no full PII while staying
  // recognisable to teammates who know the user.
  private async notifyTherapyChannelOfBooking(
    action: SIMPLYBOOK_ACTION_ENUM,
    therapySession: TherapySessionEntity,
    userEmail: string,
    userId: string,
  ): Promise<void> {
    const maskedEmail = partiallyMaskEmail(userEmail);
    const timezone = therapySession.clientTimezone || 'unknown timezone';
    const when = therapySession.startDateTime
      ? new Date(therapySession.startDateTime).toISOString()
      : 'unknown time';

    const header =
      action === SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING
        ? 'New therapy booking'
        : action === SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING
          ? 'Therapy booking cancelled'
          : 'Therapy booking updated';

    const lines = [
      `*${header}*`,
      `• Booking code: ${therapySession.bookingCode}`,
      `• User: ${maskedEmail} (id: ${userId})`,
      `• Service: ${therapySession.serviceName}`,
      `• Provider: ${therapySession.serviceProviderName}`,
      `• When: ${when} (${timezone})`,
    ];
    if (
      action === SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING &&
      therapySession.rescheduledFrom
    ) {
      lines.push(`• Rescheduled from: ${new Date(therapySession.rescheduledFrom).toISOString()}`);
    }

    // Aggregate counter state across all the user's active partner accesses (matching
    // what the Bloom UI displays — the user may have multiple access codes), plus list
    // their partner names for context.
    try {
      const userPartnerAccesses = await this.partnerAccessRepository.find({
        where: { userId, active: true },
        relations: { partner: true },
      });

      const totalRemaining = userPartnerAccesses.reduce(
        (sum, pa) => sum + (pa.therapySessionsRemaining ?? 0),
        0,
      );
      const totalRedeemed = userPartnerAccesses.reduce(
        (sum, pa) => sum + (pa.therapySessionsRedeemed ?? 0),
        0,
      );
      lines.push(`• Sessions remaining (total across access codes): ${totalRemaining}`);
      lines.push(`• Sessions redeemed (total across access codes): ${totalRedeemed}`);

      const partnerNames = userPartnerAccesses
        .map((pa) => pa.partner?.name)
        .filter((name): name is string => !!name);
      if (partnerNames.length > 0) {
        lines.push(`• Partners: ${[...new Set(partnerNames)].join(', ')}`);
      }
    } catch {
      // Don't fail the notification just because we couldn't look up the partner access data.
      // The rest of the message is still useful on its own.
    }

    try {
      await this.slackMessageClient.sendMessageToTherapySlackChannel(lines.join('\n'));
    } catch (err) {
      // Don't fail the webhook if Slack is unavailable — log and continue.
      const message = err instanceof Error ? err.message : 'unknown error';
      this.logger.error(
        `notifyTherapyChannelOfBooking failed for booking_code ${therapySession.bookingCode}: ${message}`,
      );
    }
  }

  private async getSimplyBookTherapyUser(userId: string, client_email: string): Promise<IUser> {
    if (!userId) {
      // No userId sent in the webhook - likely due to user clicking simplybook link from email instead of in-app widget
      // Try to find a user associated to this email
      try {
        // Check for previous therapy sessions associated to the email
        const previousTherapySession = await this.therapySessionRepository.findOneBy({
          clientEmail: ILike(client_email),
        });

        if (previousTherapySession?.userId) {
          userId = previousTherapySession.userId;
        } else {
          // No previous therapy sessions, try matching email with user
          const user = await this.userRepository.findOneBy({
            email: ILike(client_email),
          });
          if (user?.id) {
            userId = user.id;
          }
        }
      } catch (err) {
        const error = `UpdatePartnerAccessTherapy - error finding user in therapyRepository or userRepository - ${err?.message || 'unknown error'}`;
        this.logger.error(error);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      if (!userId) {
        // All searches tried and failed, throw 404/400 error
        const error = 'UpdatePartnerAccessTherapy - user not found and no userId provided';
        this.logger.error(error);
        throw new HttpException(error, HttpStatus.BAD_REQUEST);
      }
    }

    try {
      // userId available, find and return user record
      const user = await this.userRepository.findOneBy({ id: userId });
      if (user) return user;

      // No user record found for userId, throw error
      await this.slackMessageClient.sendMessageToTherapySlackChannel(
        `Unknown user made a therapy booking, userID ${userId} 🚨`,
      );
      const error = `User not found`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    } catch (err) {
      const error = `UpdatePartnerAccessTherapy - error finding user with userID ${userId} - ${err?.message || 'unknown error'}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async newPartnerAccessTherapy(user: IUser, simplyBookDto: SimplybookBodyDto) {
    const partnerAccesses = await this.partnerAccessRepository.find({
      where: {
        userId: user.id,
        active: true,
        featureTherapy: true,
        therapySessionsRemaining: MoreThan(0),
      },
      relations: {
        therapySession: true,
      },
    });

    if (!partnerAccesses.length) {
      await this.slackMessageClient.sendMessageToTherapySlackChannel(
        `User (userId: ${user.id}) booked therapy with no partner therapy access, please confirm the booking has not been made and fix the account access`,
      );
      const error = `newPartnerAccessTherapy - no partner therapy access - userId ${user.id}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.FORBIDDEN);
    }

    const partnerAccess = partnerAccesses
      .filter((tpa) => tpa.therapySessionsRemaining > 0)
      .sort(
        (a: PartnerAccessEntity, b: PartnerAccessEntity) =>
          a.createdAt.getTime() - b.createdAt.getTime(),
      )[0];

    if (!partnerAccess) {
      await this.slackMessageClient.sendMessageToTherapySlackChannel(
        `User (userId: ${user.id}) booked therapy with no therapy sessions remaining, please confirm the booking has not been made`,
      );
      const error = `newPartnerAccessTherapy - user has partner therapy access but has 0 therapy sessions remaining - userId ${user.id}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.FORBIDDEN);
    }

    try {
      // Atomic counter updates avoid lost-update races if two NEW_BOOKING webhooks
      // for the same partnerAccess arrive concurrently.
      await this.partnerAccessRepository.decrement(
        { id: partnerAccess.id },
        'therapySessionsRemaining',
        1,
      );
      await this.partnerAccessRepository.increment(
        { id: partnerAccess.id },
        'therapySessionsRedeemed',
        1,
      );

      const serializedTherapySession = serializeSimplybookDtoToTherapySessionEntity(
        simplyBookDto,
        partnerAccess,
      );

      const therapySession = await this.therapySessionRepository.save(serializedTherapySession);

      const updatedPartnerAccesses = await this.partnerAccessRepository.find({
        where: {
          userId: user.id,
          active: true,
          featureTherapy: true,
        },
        relations: {
          therapySession: true,
        },
      });
      this.serviceUserProfilesService.updateServiceUserProfilesTherapy(
        updatedPartnerAccesses,
        user.email,
      );

      await this.notifyTherapyChannelOfBooking(
        SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING,
        therapySession,
        user.email,
        user.id,
      );

      return therapySession;
    } catch (err) {
      const error = `newPartnerAccessTherapy - error saving new therapy session and partner access - userId ${user.id} - ${err?.message || 'unknown error'}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async updateOrCreateStoryData(
    storyData: ISbStoryData,
    status: STORYBLOK_STORY_STATUS_ENUM,
  ) {
    const storyPageComponent = storyData.content.component as STORYBLOK_PAGE_COMPONENTS;

    const updatedStoryData = {
      name: storyData.content.name,
      slug: storyData.full_slug,
      status: status,
      themes: (storyData.content.themes as THEMES[]) ?? null,
    }; // fields to update on existing and new stories

    const newStoryData = {
      storyblokUuid: storyData.uuid,
      ...updatedStoryData,
    }; // includes storyblok id and uuid for new stories only

    try {
      if (
        storyPageComponent === STORYBLOK_PAGE_COMPONENTS.RESOURCE_SHORT_VIDEO ||
        storyPageComponent === STORYBLOK_PAGE_COMPONENTS.RESOURCE_CONVERSATION ||
        storyPageComponent === STORYBLOK_PAGE_COMPONENTS.RESOURCE_SINGLE_VIDEO
      ) {
        const resourceCategory =
          storyPageComponent === STORYBLOK_PAGE_COMPONENTS.RESOURCE_SHORT_VIDEO
            ? RESOURCE_CATEGORIES.SHORT_VIDEO
            : storyPageComponent === STORYBLOK_PAGE_COMPONENTS.RESOURCE_SINGLE_VIDEO
              ? RESOURCE_CATEGORIES.SINGLE_VIDEO
              : RESOURCE_CATEGORIES.CONVERSATION;

        const existingResource = await this.resourceRepository.findOneBy({
          storyblokUuid: storyData.uuid,
        });
        const data = existingResource
          ? { ...existingResource, ...updatedStoryData }
          : { ...newStoryData, category: resourceCategory };

        const resource = await this.resourceRepository.save(data);
        this.logger.log(`Storyblok resource ${status} success - ${resource.name}`);
        return resource;
      }

      if (storyPageComponent === STORYBLOK_PAGE_COMPONENTS.COURSE) {
        const existingCourse = await this.courseRepository.findOneBy({
          storyblokUuid: storyData.uuid,
        });
        const data = existingCourse
          ? { ...existingCourse, ...updatedStoryData }
          : { ...newStoryData };

        const course = await this.courseRepository.save(data);

        if (!existingCourse)
          // new course, add mailchimp course field
          this.serviceUserProfilesService.createMailchimpCourseMergeField(updatedStoryData.name);

        await this.coursePartnerService.updateCoursePartners(
          storyData.content?.included_for_partners,
          course.id,
        );
        this.logger.log(`Storyblok course ${status} success - ${course.name}`);
        return course;
      }

      if (
        storyPageComponent === STORYBLOK_PAGE_COMPONENTS.SESSION ||
        storyPageComponent === STORYBLOK_PAGE_COMPONENTS.SESSION_IBA
      ) {
        const course = await this.courseRepository.findOneByOrFail({
          storyblokUuid: storyData.content.course,
        });

        const existingSession = await this.sessionRepository.findOneBy({
          storyblokUuid: storyData.uuid,
        });
        const data = existingSession
          ? { ...existingSession, ...updatedStoryData, courseId: course.id }
          : { ...newStoryData, courseId: course.id };

        const session = await this.sessionRepository.save(data);
        this.logger.log(`Storyblok session ${status} success - ${session.name}`);
        return session;
      }
      return undefined; // Story wasn't a course, session or resource story. No sync or updates completed
    } catch (err) {
      const error = `Storyblok webhook failed - error updating or creating ${status} ${storyPageComponent} story record ${storyData.uuid} - ${err?.message || 'unknown error'}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateInactiveStoryStatus(storyblokUuid: string, status: STORYBLOK_STORY_STATUS_ENUM) {
    // Story is deleted so cant be fetched from storyblok to get story type
    // Try to find course with matching story_id first
    let course = await this.courseRepository.findOneBy({
      storyblokUuid,
    });

    if (course) {
      course = await this.courseRepository.save({ ...course, status });
      this.logger.log(`Storyblok course ${status} success - ${course.name}`);
      return course;
    }
    // No course found, try finding session instead
    let session = await this.sessionRepository.findOneBy({
      storyblokUuid,
    });

    if (session) {
      session = await this.sessionRepository.save({ ...session, status });
      this.logger.log(`Storyblok session ${status} success - ${session.name}`);
      return session;
    }

    // No session found, try finding resource instead
    let resource = await this.resourceRepository.findOneBy({
      storyblokUuid,
    });

    if (resource) {
      resource = await this.resourceRepository.save({ ...resource, status });
      this.logger.log(`Storyblok session ${status} success - ${resource.name}`);
      return resource;
    }
  }

  async handleStoryblokWebhook(
    rawBody: Buffer | undefined,
    signature: string | undefined,
    data: StoryWebhookDto,
  ) {
    if (!signature) {
      const error = 'Storyblok webhook error - no signature provided';
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.UNAUTHORIZED);
    }
    if (!rawBody) {
      const error = 'Storyblok webhook error - raw body unavailable';
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const bodyHmac = createHmac('sha1', storyblokWebhookSecret).update(rawBody).digest('hex');
    const expectedBuf = Buffer.from(bodyHmac);
    const providedBuf = Buffer.from(signature);
    if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
      const error = 'Storyblok webhook error - signature mismatch';
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.UNAUTHORIZED);
    }
    return this.handleStoryUpdated(data);
  }

  async handleStoryUpdated(data: StoryWebhookDto) {
    const status = data.action;
    const story_slug = data.full_slug;

    this.logger.log(`Storyblok story ${status} request - ${story_slug}`);

    // Story was either published or moved
    // Retrieve the story data from storyblok before handling the update/create
    let story: ISbStoryData;

    if (!storyblokToken) {
      const error = `Storyblok webhook failed - missing storyblok token`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await apiCall({
        url: `https://api.storyblok.com/v2/cdn/stories/${story_slug}?token=${storyblokToken}`,
        type: 'get',
      });
      if (response?.data?.story) {
        story = response.data.story as ISbStoryData;
      }
    } catch (err) {
      if (err.status === 404) {
        const error = `Storyblok webhook failed - story not found in storyblok for story ${story_slug}`;
        this.logger.error(error);
        throw new HttpException(error, HttpStatus.NOT_FOUND);
      }
      const error = `Storyblok webhook failed - error getting story from storyblok - ${err?.message || 'unknown error'}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!story || !story.slug) {
      const error = `Storyblok webhook failed - missing story in response for story ${story_slug}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }

    const storyblokUuid = story.uuid;
    if (
      status === STORYBLOK_STORY_STATUS_ENUM.UNPUBLISHED ||
      status === STORYBLOK_STORY_STATUS_ENUM.DELETED
    ) {
      // Story can't be retrieved from storyblok so we just update the status of existing records
      return this.updateInactiveStoryStatus(storyblokUuid, status);
    }

    // Create or update the resource/course/session record in our database
    return this.updateOrCreateStoryData(story, status);
  }

  async handleMailchimpWebhook(dto: MailchimpWebhookDto, secret: string): Promise<void> {
    if (!mailchimpWebhookSecret || secret !== mailchimpWebhookSecret) {
      this.logger.error('Mailchimp webhook error - invalid secret');
      throw new HttpException('Mailchimp webhook error - invalid secret', HttpStatus.UNAUTHORIZED);
    }

    const { type, data } = dto;
    const email = data?.email;

    if (!email) {
      this.logger.warn(`Mailchimp webhook: no email in payload for event type "${type}"`);
      return;
    }

    // Hard bounces and cleaned addresses indicate permanent delivery failure.
    // Soft bounces are transient — Mailchimp retries internally so we leave those alone.
    const isHardBounce = type === 'bounce' && data.action === 'hard';
    const isCleaned = type === 'cleaned';

    if (!isHardBounce && !isCleaned) return;

    const reason = data.reason ?? data.action ?? type;
    this.logger.log(
      `Mailchimp webhook: ${type} (reason=${reason}) — recording delivery outcome`,
    );

    try {
      if (isHardBounce) {
        await this.chatUserService.markUnreadNotificationDeliveryFailure(
          email,
          UNREAD_NOTIFICATION_STATUS.BOUNCED,
          `mailchimp_bounce: ${reason}`,
        );
      } else {
        await this.chatUserService.markUnreadNotificationDeliveryFailure(
          email,
          UNREAD_NOTIFICATION_STATUS.CLEANED,
          `mailchimp_cleaned: ${reason}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Mailchimp webhook: failed to record ${type}: ${(err as Error)?.message || 'unknown error'}`,
      );
    }
  }
}
