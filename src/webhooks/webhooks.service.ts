import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Logger } from 'src/logger/logger';
import { InjectRepository } from '@nestjs/typeorm';
import { ISbStoryData } from '@storyblok/js';
import apiCall from 'src/api/apiCalls';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { CourseEntity } from 'src/entities/course.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { ResourceEntity } from 'src/entities/resource.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { EVENT_NAME } from 'src/event-logger/event-logger.interface';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { FrontChatGateway } from 'src/front-chat/front-chat.gateway';
import { FRONT_WEBHOOK_EVENT_TYPE } from 'src/front-chat/front-chat.interface';
import { FrontChatService } from 'src/front-chat/front-chat.service';
import { ZapierSimplybookBodyDto } from 'src/partner-access/dtos/zapier-body.dto';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { IUser } from 'src/user/user.interface';
import { serializeZapierSimplyBookDtoToTherapySessionEntity } from 'src/utils/serialize';
import { ILike, MoreThan, Repository } from 'typeorm';
import { CoursePartnerService } from '../course-partner/course-partner.service';
import {
  isProduction,
  RESOURCE_CATEGORIES,
  SIMPLYBOOK_ACTION_ENUM,
  STORYBLOK_PAGE_COMPONENTS,
  STORYBLOK_STORY_STATUS_ENUM,
  storyblokToken,
} from '../utils/constants';
import {
  FrontChatWebhookDto,
  FrontWebhookMessageAuthor,
} from 'src/webhooks/dto/front-chat-webhook.dto';
import { FrontChannelOutboundPayload } from 'src/webhooks/dto/front-channel-webhook.dto';
import { buildThreadRef } from 'src/front-chat/front-chat.service';
import { StoryWebhookDto } from './dto/story.dto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger('WebhookService');

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
    private eventLoggerService: EventLoggerService,
    private frontChatGateway: FrontChatGateway,
    private frontChatService: FrontChatService,
  ) {}

  async updatePartnerAccessTherapy(
    simplyBookDto: ZapierSimplybookBodyDto,
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
      const error = `UpdatePartnerAccessTherapy - existing therapy session not found for booking code ${booking_code}`;
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

    // If the booking is cancelled, increment the therapy sessions remaining on related partner access
    if (action === SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING) {
      try {
        const partnerAccess = await this.partnerAccessRepository.findOneBy({
          id: existingTherapySession.partnerAccessId,
        });

        partnerAccess.therapySessionsRemaining += 1;
        partnerAccess.therapySessionsRedeemed -= 1;

        await this.partnerAccessRepository.save(partnerAccess);

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

  private async newPartnerAccessTherapy(user: IUser, simplyBookDto: ZapierSimplybookBodyDto) {
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

    partnerAccess.therapySessionsRemaining -= 1;
    partnerAccess.therapySessionsRedeemed += 1;

    try {
      const serializedTherapySession = serializeZapierSimplyBookDtoToTherapySessionEntity(
        simplyBookDto,
        partnerAccess,
      );

      await this.partnerAccessRepository.save(partnerAccess);
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

  // Handle Storyblok story status change (published, unpublished, moved, deleted)
  // Triggered by a webhook, this function handles updating our database records to sync with storyblok story data
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

  async handleFrontChatWebhook(data: FrontChatWebhookDto): Promise<void> {
    const email = data.conversation?.recipient?.handle;
    if (!email) {
      this.logger.warn(`Front webhook ${data.type} event ${data.id}: no recipient email, skipping`);
      return;
    }

    // Forward agent replies to the connected user in real-time.
    if (
      data.type === FRONT_WEBHOOK_EVENT_TYPE.OUTBOUND ||
      data.type === FRONT_WEBHOOK_EVENT_TYPE.OUT_REPLY
    ) {
      const msgData = data.target?.data;
      const body = msgData?.text ?? (msgData?.body ? this.stripHtml(msgData.body) : '');
      if (body) {
        this.frontChatGateway.emitAgentReply(email, {
          id: data.id,
          body,
          authorEmail: msgData?.author?.email,
          authorName: this.formatAuthorName(msgData?.author),
          emittedAt: data.emitted_at,
        });
        this.logger.log(`Front Events webhook: emitted agent reply to ${email}`);
      }

      // Update chat activity: received timestamp + capture conversation ID if not already stored.
      this.frontChatService
        .updateChatUserByEmail(email, {
          lastMessageReceivedAt: new Date(data.emitted_at * 1000),
          ...(data.conversation?.id ? { frontConversationId: data.conversation.id } : {}),
        })
        .then((chatUser) => {
          if (chatUser) {
            return this.serviceUserProfilesService.updateServiceUserProfilesChatActivity(
              chatUser,
              email,
            );
          }
        })
        .catch(() => {});
    }

    const eventName = this.mapFrontEventToEventName(data.type);
    if (!eventName) {
      this.logger.log(`Front webhook event type "${data.type}" is not tracked, skipping`);
      return;
    }

    try {
      await this.eventLoggerService.createEventLog(
        {
          event: eventName,
          date: new Date(data.emitted_at * 1000),
        },
        email,
      );
      this.logger.log(`Front webhook: logged ${eventName} for ${email}`);
    } catch (error) {
      // Don't fail the webhook response if event logging fails (e.g. user not found)
      this.logger.warn(
        `Front webhook: failed to log ${eventName} for ${email}: ${error?.message || 'unknown error'}`,
      );
    }
  }

  private stripHtml(input: string): string {
    return input
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  // Handles outbound messages Front sends to a Custom Channel when an agent
  // replies in the Front UI. Front REQUIRES a 200 with this exact body shape
  // (https://dev.frontapp.com/docs/getting-started-1) — any other response
  // surfaces as "channel servers are unresponsive" to the agent.
  async handleFrontChannelOutbound(
    data: FrontChannelOutboundPayload | Record<string, unknown>,
  ): Promise<{ type: 'success'; external_id: string; external_conversation_id: string }> {
    const payload = (data as FrontChannelOutboundPayload).payload ?? {};
    // Front Channel API sends `recipients`; fall back to `to` for legacy variants.
    const recipients = payload.recipients ?? payload.to ?? [];
    const recipientEmail = recipients.find((r) => r?.role === 'to' && r?.handle)?.handle
      ?? recipients.find((r) => r?.handle)?.handle;
    const messageBody = payload.text ?? payload.body ?? '';
    const externalId = payload.id || `front-${Date.now()}`;
    const externalConversationId =
      (data as FrontChannelOutboundPayload).metadata?.external_conversation_ids?.[0] ??
      (data as FrontChannelOutboundPayload).metadata?.external_conversation_id ??
      (recipientEmail ? buildThreadRef(recipientEmail) : externalId);

    if (recipientEmail && messageBody) {
      this.frontChatGateway.emitAgentReply(recipientEmail, {
        id: payload.id,
        body: messageBody,
        authorEmail: payload.author?.email,
        authorName: this.formatAuthorName(
          payload.author as FrontWebhookMessageAuthor | undefined,
        ),
        emittedAt: Math.floor(Date.now() / 1000),
      });
      this.logger.log(`Front Channel: forwarded agent reply to ${recipientEmail}`);

      this.frontChatService
        .updateChatUserByEmail(recipientEmail, { lastMessageReceivedAt: new Date() })
        .then((chatUser) => {
          if (chatUser) {
            return this.serviceUserProfilesService.updateServiceUserProfilesChatActivity(
              chatUser,
              recipientEmail,
            );
          }
        })
        .catch(() => {});
    } else {
      this.logger.warn(
        `Front Channel: missing recipient or body (recipient=${recipientEmail}, hasBody=${!!messageBody})`,
      );
    }

    return {
      type: 'success',
      external_id: externalId,
      external_conversation_id: externalConversationId,
    };
  }

  private formatAuthorName(author: FrontWebhookMessageAuthor | undefined): string | undefined {
    if (!author) return undefined;
    const full = [author.first_name, author.last_name].filter(Boolean).join(' ').trim();
    return full || author.username || undefined;
  }

  private mapFrontEventToEventName(type: string): EVENT_NAME | null {
    switch (type) {
      case FRONT_WEBHOOK_EVENT_TYPE.INBOUND:
        return EVENT_NAME.CHAT_MESSAGE_SENT;
      case FRONT_WEBHOOK_EVENT_TYPE.OUTBOUND:
      case FRONT_WEBHOOK_EVENT_TYPE.OUT_REPLY:
        return EVENT_NAME.CHAT_MESSAGE_RECEIVED;
      default:
        return null;
    }
  }
}
