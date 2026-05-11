import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  batchCreateMailchimpProfiles,
  batchUpdateMailchimpProfiles,
  createMailchimpMergeField,
  createMailchimpProfile,
  sendMailchimpUserEvent,
  updateMailchimpProfile,
} from 'src/api/mailchimp/mailchimp-api';
import {
  ListMemberCustomFields,
  ListMemberPartial,
  MAILCHIMP_CUSTOM_EVENTS,
  MAILCHIMP_MERGE_FIELD_TYPES,
} from 'src/api/mailchimp/mailchimp-api.interfaces';
import { ChatUserEntity } from 'src/entities/chat-user.entity';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { UserEntity } from 'src/entities/user.entity';
import { FrontChatContactCustomFields } from 'src/front-chat/front-chat.interface';
import { FrontChatService } from 'src/front-chat/front-chat.service';
import { Logger } from 'src/logger/logger';
import { And, ILike, Raw, Repository } from 'typeorm';
import {
  LANGUAGE_DEFAULT,
  PROGRESS_STATUS,
  SIMPLYBOOK_ACTION_ENUM,
  mailchimpMarketingPermissionId,
} from '../utils/constants';
import { getAcronym, isCypressTestEmail } from '../utils/utils';

// Mailchimp merge field tags are limited to 10 uppercase characters, so user data is
// serialised into separate schemas for each service.

// Errors are swallowed and logged rather than thrown to avoid disrupting the calling flow.
const logger = new Logger('ServiceUserProfiles');

@Injectable()
export class ServiceUserProfilesService {
  constructor(
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
    private frontChatService: FrontChatService,
  ) {}

  async createServiceUserProfiles(
    user: UserEntity,
    partner?: PartnerEntity | null,
    partnerAccess?: PartnerAccessEntity | null,
  ) {
    const { email } = user;

    if (isCypressTestEmail(email)) {
      logger.log('Skipping service user profile creation for Cypress test email');
      return;
    }

    const userData = this.serializeUserData(user);
    // partnerAccess.therapySession may not be loaded at signup time — default to empty.
    const partnerAccesses = partnerAccess
      ? [{ ...partnerAccess, partner, therapySession: partnerAccess.therapySession ?? [] }]
      : [];
    const partnerData = this.serializePartnerAccessData(partnerAccesses);
    const therapyData = this.serializeTherapyData(partnerAccesses);
    const userSignedUpAt = user.createdAt?.toISOString();

    try {
      // Create with all custom fields so the initial record matches getOrCreateFrontContact.
      await this.frontChatService.createContact({
        email: email,
        name: user.name,
        userId: user.id,
        customFields: {
          signed_up_at: userSignedUpAt,
          ...userData.frontChatSchema,
          ...partnerData.frontChatSchema,
          ...therapyData.frontChatSchema,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      logger.error(`Create Front Chat profile error: ${message}`);
    }

    try {
      await createMailchimpProfile({
        email_address: email,
        ...userData.mailchimpSchema,
        ...partnerData.mailchimpSchema,
        merge_fields: {
          SIGNUPD: userSignedUpAt,
          ...userData.mailchimpSchema.merge_fields,
          ...partnerData.mailchimpSchema.merge_fields,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      logger.error(`Create Mailchimp profile error: ${message}`);
    }

    logger.log('Create user: updated service user profiles');
  }

  async getOrCreateFrontContact(user: UserEntity): Promise<void> {
    const { email } = user;
    if (isCypressTestEmail(email)) return;

    let exists: boolean;
    try {
      exists = await this.frontChatService.contactExists(email);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      logger.error(`getOrCreateFrontContact existence check failed for ${email}: ${message}`);
      return;
    }

    if (!exists) {
      // Load full relations from DB so the new contact gets all custom fields populated.
      const hydratedUser = await this.userRepository.findOne({
        where: { id: user.id },
        relations: {
          partnerAccess: { partner: true, therapySession: true },
          courseUser: { course: true, sessionUser: { session: true } },
        },
      });
      if (!hydratedUser) return;

      try {
        await this.frontChatService.createContact({
          email,
          name: hydratedUser.name,
          customFields: this.buildFrontCustomFields(hydratedUser),
          userId: hydratedUser.id,
        });
        logger.log(`Backfilled Front contact for ${email}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';
        logger.error(`getOrCreateFrontContact create failed for ${email}: ${message}`);
      }
    } else {
      // Contact already exists — ensure the channel handle is present so Channel API
      // messages link to this contact. Custom fields stay current via syncFrontContactCustomFields
      // called from each profile update method; no need to re-sync on every widget open.
      this.frontChatService.addChannelHandle(email).catch(() => {});
    }
  }

  private buildFrontCustomFields(user: UserEntity): FrontChatContactCustomFields {
    const userData = this.serializeUserData(user);
    const partnerData = this.serializePartnerAccessData(user.partnerAccess ?? []);
    const therapyData = this.serializeTherapyData(user.partnerAccess ?? []);
    const courseFields: Record<string, string> = {};
    for (const cu of user.courseUser ?? []) {
      Object.assign(courseFields, this.serializeCourseData(cu).frontChatSchema);
    }
    return {
      signed_up_at: user.createdAt?.toISOString(),
      ...userData.frontChatSchema,
      ...partnerData.frontChatSchema,
      ...therapyData.frontChatSchema,
      ...courseFields,
    };
  }

  // Front's custom_fields PATCH replaces all fields, so partial updates would wipe data —
  // this always sends the complete set.
  async syncFrontContactCustomFields(email: string): Promise<void> {
    try {
      // Case-insensitive: signup doesn't normalise the email column.
      const user = await this.userRepository.findOne({
        where: { email: ILike(email) },
        relations: {
          partnerAccess: { partner: true, therapySession: true },
          courseUser: { course: true, sessionUser: { session: true } },
        },
      });
      if (!user) return;
      try {
        await this.frontChatService.updateContactCustomFields(
          this.buildFrontCustomFields(user),
          email,
        );
      } catch (err) {
        if (this.isFrontContactNotFound(err)) {
          await this.getOrCreateFrontContact(user);
        } else {
          throw err;
        }
      }
    } catch (error) {
      const status =
        (error as { cause?: { status?: number }; status?: number })?.cause?.status ??
        (error as { status?: number })?.status;
      const message = error instanceof Error ? error.message : 'unknown error';
      logger.error(`Sync Front Chat contact custom fields error (status=${status}): ${message}`);
    }
  }

  private isFrontContactNotFound(error: unknown): boolean {
    const cause = (error as { cause?: { status?: number } })?.cause;
    if (cause?.status === 404) return true;
    return (error as Error)?.message?.includes('(404)') ?? false;
  }

  private isMailchimpNotFound(error: unknown): boolean {
    const status = (error as { status?: number })?.status;
    if (status === 404) return true;
    const cause = (error as { cause?: { status?: number } })?.cause;
    if (cause?.status === 404) return true;
    return (error as Error)?.message?.includes('status=404') ?? false;
  }

  private async syncMailchimpProfile(
    partialUpdate: ListMemberPartial,
    targetEmail: string,
    context: string,
    recoveryEmail: string = targetEmail,
  ): Promise<void> {
    try {
      await updateMailchimpProfile(partialUpdate, targetEmail);
    } catch (error) {
      const status = (error as { status?: number })?.status;
      if (!this.isMailchimpNotFound(error)) {
        const message = error instanceof Error ? error.message : 'unknown error';
        logger.error(`Update Mailchimp ${context} error (status=${status}) - ${message}`);
        return;
      }
      try {
        const user = await this.userRepository.findOne({
          where: { email: ILike(recoveryEmail) },
          relations: {
            partnerAccess: { partner: true, therapySession: true },
            courseUser: { course: true, sessionUser: { session: true } },
          },
        });
        if (!user) {
          logger.error(`Mailchimp 404 recovery (${context}): user not found in DB`);
          return;
        }
        const chatUser = await this.frontChatService.getChatUser(user.id);
        const profileData = this.createCompleteMailchimpUserProfile(user, chatUser);
        profileData.merge_fields = {
          ...profileData.merge_fields,
          ...(partialUpdate.merge_fields ?? {}),
        };
        await createMailchimpProfile(profileData);
      } catch (recoverError) {
        const recoverStatus = (recoverError as { status?: number })?.status;
        const message = recoverError instanceof Error ? recoverError.message : 'unknown error';
        logger.error(
          `Recreate Mailchimp profile failed (${context}, status=${recoverStatus}) - ${message}`,
        );
      }
    }
  }

  // Send a Mailchimp custom event with 404 recovery — for archived/missing members,
  // pipes through syncMailchimpProfile's existing recovery (PATCHes user data → 404 →
  // recreates full profile) then retries the event so the email still fires.
  async sendMailchimpUserEventWithRecovery(
    email: string,
    event: MAILCHIMP_CUSTOM_EVENTS,
  ): Promise<void> {
    if (isCypressTestEmail(email)) return;
    try {
      await sendMailchimpUserEvent(email, event);
    } catch (error) {
      const status = (error as { status?: number })?.status;
      if (!this.isMailchimpNotFound(error)) {
        const message = error instanceof Error ? error.message : 'unknown error';
        logger.error(`Send Mailchimp event ${event} failed (status=${status}) - ${message}`);
        return;
      }
      try {
        const user = await this.userRepository.findOneBy({ email: ILike(email) });
        if (!user) {
          logger.error(`Mailchimp event ${event} recovery: user not found in DB`);
          return;
        }
        await this.syncMailchimpProfile(
          this.serializeUserData(user).mailchimpSchema,
          email,
          `event ${event} pre-retry`,
        );
        await sendMailchimpUserEvent(email, event);
      } catch (retryError) {
        const retryStatus = (retryError as { status?: number })?.status;
        const message = retryError instanceof Error ? retryError.message : 'unknown error';
        logger.error(
          `Send Mailchimp event ${event} retry failed (status=${retryStatus}) - ${message}`,
        );
      }
    }
  }

  async updateServiceUserProfilesUser(
    user: UserEntity,
    isProfileUpdateRequired: boolean,
    isEmailUpdateRequired: boolean,
    isLanguageUpdateRequired: boolean,
    existingEmail: string,
  ) {
    // Defensive: caller spreads updateUserDto over the user entity, so user.email can be
    // undefined when the DTO has `email: undefined`. Fall back to existingEmail so recovery
    // (createContact / contactExists) has a real address to work with.
    if (!user.email) user = { ...user, email: existingEmail };
    const email = isEmailUpdateRequired ? user.email : existingEmail;

    if (isCypressTestEmail(email) || isCypressTestEmail(existingEmail)) {
      logger.log('Skipping service user profile update for Cypress test email');
      return;
    }

    const userData = this.serializeUserData(user);

    if (isProfileUpdateRequired) {
      const profilePayload = {
        ...(isEmailUpdateRequired && { email: email }),
        name: user.name,
      };
      try {
        await this.frontChatService.updateContactProfile(profilePayload, existingEmail);
      } catch (error) {
        if (this.isFrontContactNotFound(error)) {
          await this.getOrCreateFrontContact(user);
        } else {
          const status =
            (error as { cause?: { status?: number }; status?: number })?.cause?.status ??
            (error as { status?: number })?.status;
          const message = error instanceof Error ? error.message : 'unknown error';
          logger.error(`Update Front Chat user profile error (status=${status}) - ${message}`);
        }
      }
    }

    // Sync all custom fields to Front with the complete set (partial PATCH would wipe other fields).
    await this.syncFrontContactCustomFields(email);

    // Mirror language onto the Front conversation only when it actually changed — otherwise
    // every name/email/permissions/lastActiveAt update would re-PATCH the same value.
    // New conversations get language set when their ID is first resolved (see front-chat.service.ts).
    if (isLanguageUpdateRequired) {
      await this.frontChatService.syncConversationLanguage(user.id);
    }

    // Recovery looks up by user.email (post-update) — existingEmail may have just been changed.
    await this.syncMailchimpProfile(
      {
        ...userData.mailchimpSchema,
        ...(isEmailUpdateRequired && { email_address: email }),
      },
      existingEmail,
      'user profile',
      user.email,
    );

    logger.log('Updated service user profiles user');
  }

  async updateServiceUserProfilesPartnerAccess(
    partnerAccesses: PartnerAccessEntity[],
    email: string,
  ) {
    if (isCypressTestEmail(email)) {
      logger.log('Skipping service user profile partner access update for Cypress test email');
      return;
    }

    const partnerAccessData = this.serializePartnerAccessData(partnerAccesses);

    // Sync all custom fields to Front with the complete set (partial PATCH would wipe other fields).
    await this.syncFrontContactCustomFields(email);

    await this.syncMailchimpProfile(partnerAccessData.mailchimpSchema, email, 'partner access');
  }

  async updateServiceUserProfilesTherapy(partnerAccesses: PartnerAccessEntity[], email) {
    if (isCypressTestEmail(email)) {
      logger.log('Skipping service user profile therapy update for Cypress test email');
      return;
    }

    const therapyData = this.serializeTherapyData(partnerAccesses);

    // Sync all custom fields to Front with the complete set (partial PATCH would wipe other fields).
    await this.syncFrontContactCustomFields(email);

    await this.syncMailchimpProfile(therapyData.mailchimpSchema, email, 'therapy');
  }

  async updateServiceUserProfilesCourse(courseUser: CourseUserEntity, email: string) {
    if (isCypressTestEmail(email)) {
      logger.log('Skipping service user profile course update for Cypress test email');
      return;
    }

    const courseData = this.serializeCourseData(courseUser);

    // Sync all custom fields to Front with the complete set (partial PATCH would wipe other fields).
    await this.syncFrontContactCustomFields(email);

    await this.syncMailchimpProfile(courseData.mailchimpSchema, email, 'course');
  }

  async updateServiceUserProfilesChatActivity(
    chatUser: ChatUserEntity,
    email: string,
  ): Promise<void> {
    if (isCypressTestEmail(email)) return;

    // Chat activity timestamps are Mailchimp-only by design.
    const data = this.serializeChatActivityData(chatUser);
    await this.syncMailchimpProfile(data.mailchimpSchema, email, `chat activity for ${email}`);
  }

  serializeChatActivityData(chatUser: ChatUserEntity) {
    const sentAt = chatUser.lastMessageSentAt?.toISOString();
    const receivedAt = chatUser.lastMessageReceivedAt?.toISOString();
    const readAt = chatUser.lastMessageReadAt?.toISOString();

    const mergeFields: ListMemberCustomFields = {};
    if (sentAt) mergeFields.CHATLSTMTX = sentAt;
    if (receivedAt) mergeFields.CHATLSTMRX = receivedAt;
    if (readAt) mergeFields.CHATMSGRD = readAt;

    const mailchimpSchema = { merge_fields: mergeFields } as ListMemberPartial;

    return { mailchimpSchema };
  }

  // Mailchimp merge fields must be created before they can be written to.
  async createMailchimpCourseMergeField(courseName: string) {
    try {
      const courseAcronym = getAcronym(courseName);
      const courseMergeFieldName = `Course ${courseAcronym} Status`;
      const courseMergeFieldTag = `C_${courseAcronym}`;
      const courseSessionsMergeFieldName = `Course ${courseAcronym} Sessions`;
      const courseSessionsMergeFieldTag = `C_${courseAcronym}_S`;

      await createMailchimpMergeField(
        courseMergeFieldName,
        courseMergeFieldTag,
        MAILCHIMP_MERGE_FIELD_TYPES.TEXT,
      );
      await createMailchimpMergeField(
        courseSessionsMergeFieldName,
        courseSessionsMergeFieldTag,
        MAILCHIMP_MERGE_FIELD_TYPES.TEXT,
      );
    } catch (error) {
      logger.error(
        `Create mailchimp course merge fields error - ${error?.message || 'unknown error'}`,
      );
    }
  }

  createCompleteMailchimpUserProfile(
    user: UserEntity,
    chatUser?: ChatUserEntity | null,
  ): ListMemberPartial {
    const userData = this.serializeUserData(user);
    const partnerData = this.serializePartnerAccessData(user.partnerAccess);
    const therapyData = this.serializeTherapyData(user.partnerAccess);

    const courseData = {};
    user.courseUser.forEach((courseUser) => {
      const courseUserData = this.serializeCourseData(courseUser);
      Object.keys(courseUserData.mailchimpSchema.merge_fields).forEach((key) => {
        courseData[key] = courseUserData.mailchimpSchema.merge_fields[key];
      });
    });

    const chatFields = chatUser
      ? this.serializeChatActivityData(chatUser).mailchimpSchema.merge_fields
      : {};

    const profileData = {
      email_address: user.email,
      ...userData.mailchimpSchema,

      merge_fields: {
        SIGNUPD: user.createdAt?.toISOString(),
        ...userData.mailchimpSchema.merge_fields,
        ...partnerData.mailchimpSchema.merge_fields,
        ...therapyData.mailchimpSchema.merge_fields,
        ...courseData,
        ...chatFields,
      },
    };
    return profileData;
  }

  // Bulk upload for backfilling users missed by a failed run.
  public async bulkUploadMailchimpProfiles(startDate: string, endDate: string) {
    try {
      const users = await this.userRepository.find({
        where: {
          createdAt: And(
            Raw((alias) => `${alias} >= :startDate`, { startDate }),
            Raw((alias) => `${alias} < :endDate`, { endDate }),
          ),
        },
        relations: {
          partnerAccess: { partner: true, therapySession: true },
          courseUser: { course: true, sessionUser: { session: true } },
        },
      });
      const mailchimpUserProfiles = users.map((user) =>
        this.createCompleteMailchimpUserProfile(user),
      );

      await batchCreateMailchimpProfiles(mailchimpUserProfiles);
      logger.log(
        `Created batch mailchimp profiles for ${users.length} users, created between ${startDate} and ${endDate}`,
      );
    } catch (error) {
      throw new HttpException(
        `Bulk upload mailchimp profiles API call failed: ${error?.message || 'unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Bulk update for re-syncing users missed by a failed run.
  public async bulkUpdateMailchimpProfiles(startDate: string, endDate: string) {
    try {
      const users = await this.userRepository.find({
        where: {
          updatedAt: And(
            Raw((alias) => `${alias} >= :startDate`, { startDate }),
            Raw((alias) => `${alias} < :endDate`, { endDate }),
          ),
          createdAt: Raw((alias) => `${alias} < :startDate`, { startDate }),
        },
        relations: {
          partnerAccess: { partner: true, therapySession: true },
          courseUser: { course: true, sessionUser: { session: true } },
        },
      });
      const mailchimpUserProfiles = users.map((user) =>
        this.createCompleteMailchimpUserProfile(user),
      );

      await batchUpdateMailchimpProfiles(mailchimpUserProfiles);
      logger.log(
        `Updated batch mailchimp profiles for ${users.length} users, updated between ${startDate} and ${endDate}`,
      );
    } catch (error) {
      throw new HttpException(
        `Bulk update mailchimp profiles API call failed: ${error?.message || 'unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  serializePartnersString(partnerAccesses: PartnerAccessEntity[]) {
    const partnersNames = partnerAccesses?.map((pa) => pa.partner.name.toLowerCase());
    const partnersString = partnersNames ? [...new Set(partnersNames)].join('; ') : '';
    return partnersString;
  }

  serializeUserData(user: UserEntity) {
    const {
      name,
      signUpLanguage,
      contactPermission,
      serviceEmailsPermission,
      lastActiveAt,
      emailRemindersFrequency,
    } = user;
    const lastActiveAtString = lastActiveAt?.toISOString();

    const frontChatSchema: FrontChatContactCustomFields = {
      marketing_permission: contactPermission,
      service_emails_permission: serviceEmailsPermission,
      email_reminders_frequency: emailRemindersFrequency,
      language: signUpLanguage || LANGUAGE_DEFAULT,
      // Name handled on base level contact profile for Front Chat
    };
    // Omit undefined — Front datetime fields reject empty strings.
    if (lastActiveAtString) frontChatSchema.last_active_at = lastActiveAtString;

    const mailchimpSchema = {
      status: serviceEmailsPermission ? 'subscribed' : 'unsubscribed',
      marketing_permissions: [
        {
          marketing_permission_id: mailchimpMarketingPermissionId,
          text: 'Email',
          enabled: contactPermission,
        },
      ],
      language: signUpLanguage || LANGUAGE_DEFAULT,
      merge_fields: {
        NAME: name,
        LACTIVED: lastActiveAtString,
        REMINDFREQ: emailRemindersFrequency,
      },
    } as ListMemberPartial;

    return { frontChatSchema, mailchimpSchema };
  }

  serializePartnerAccessData(partnerAccesses: PartnerAccessEntity[]) {
    const publicUser = !partnerAccesses || !partnerAccesses[0]?.id;

    const data = publicUser
      ? {
          partners: '',
          featureLiveChat: true,
          featureTherapy: false,
          therapySessionsRemaining: 0,
          therapySessionsRedeemed: 0,
        }
      : {
          partners: this.serializePartnersString(partnerAccesses),
          featureLiveChat: true,
          featureTherapy: !!partnerAccesses.find((pa) => pa.featureTherapy),
          therapySessionsRemaining: partnerAccesses
            .map((pa) => pa.therapySessionsRemaining)
            .reduce((a, b) => a + b, 0),
          therapySessionsRedeemed: partnerAccesses
            .map((pa) => pa.therapySessionsRedeemed)
            .reduce((a, b) => a + b, 0),
        };

    const frontChatSchema = {
      partners: data.partners,
      feature_live_chat: data.featureLiveChat,
      feature_therapy: data.featureTherapy,
      therapy_sessions_remaining: data.therapySessionsRemaining,
      therapy_sessions_redeemed: data.therapySessionsRedeemed,
    };

    const mailchimpSchema = {
      merge_fields: {
        PARTNERS: data.partners,
        FEATCHAT: String(data.featureLiveChat),
        FEATTHER: String(data.featureTherapy),
        THERREMAIN: data.therapySessionsRemaining,
        THERREDEEM: data.therapySessionsRedeemed,
      },
    } as ListMemberPartial;

    return { frontChatSchema, mailchimpSchema };
  }

  serializeTherapyData(partnerAccesses: PartnerAccessEntity[]) {
    // TypeORM may return dates as strings in some query contexts — guard both cases.
    // Returns undefined for missing dates so callers can omit the key (Front/Mailchimp
    // datetime fields reject empty strings).
    const toIso = (d: Date | string | undefined | null): string | undefined => {
      if (!d) return undefined;
      return d instanceof Date ? d.toISOString() : new Date(d as string).toISOString();
    };

    const therapySessions = partnerAccesses
      .flatMap((partnerAccess) => partnerAccess.therapySession ?? [])
      .filter(
        (therapySession) =>
          !!therapySession && therapySession.action !== SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING,
      )
      .sort((a, b) => {
        const aMs =
          a.startDateTime instanceof Date
            ? a.startDateTime.getTime()
            : new Date(a.startDateTime as unknown as string).getTime();
        const bMs =
          b.startDateTime instanceof Date
            ? b.startDateTime.getTime()
            : new Date(b.startDateTime as unknown as string).getTime();
        return aMs - bMs;
      });

    const now = new Date().getTime();
    const pastTherapySessions = therapySessions.filter(
      (therapySession) =>
        (therapySession.startDateTime instanceof Date
          ? therapySession.startDateTime.getTime()
          : new Date(therapySession.startDateTime as unknown as string).getTime()) < now,
    );
    const futureTherapySessions = therapySessions.filter(
      (therapySession) =>
        (therapySession.startDateTime instanceof Date
          ? therapySession.startDateTime.getTime()
          : new Date(therapySession.startDateTime as unknown as string).getTime()) > now,
    );

    const firstTherapySessionAt = toIso(therapySessions?.at(0)?.startDateTime);
    const lastTherapySessionAt = toIso(pastTherapySessions?.at(-1)?.startDateTime);
    const nextTherapySessionAt = toIso(futureTherapySessions?.at(0)?.startDateTime);

    const data = {
      therapySessionsRemaining: partnerAccesses.reduce(
        (sum, partnerAccess) => sum + partnerAccess.therapySessionsRemaining,
        0,
      ),
      therapySessionsRedeemed: partnerAccesses.reduce(
        (sum, partnerAccess) => sum + partnerAccess.therapySessionsRedeemed,
        0,
      ),
    };

    const frontChatSchema = {
      therapy_sessions_remaining: data.therapySessionsRemaining,
      therapy_sessions_redeemed: data.therapySessionsRedeemed,
      therapy_session_first_at: firstTherapySessionAt,
      therapy_session_next_at: nextTherapySessionAt,
      therapy_session_last_at: lastTherapySessionAt,
    };

    const mailchimpSchema = {
      merge_fields: {
        THERREMAIN: data.therapySessionsRemaining,
        THERREDEEM: data.therapySessionsRedeemed,
        THERFIRSAT: firstTherapySessionAt,
        THERNEXTAT: nextTherapySessionAt,
        THERLASTAT: lastTherapySessionAt,
      },
    };

    return { frontChatSchema, mailchimpSchema };
  }

  serializeCourseData(courseUser: CourseUserEntity) {
    const courseAcronymLowercase = getAcronym(courseUser.course.name).toLowerCase();
    const courseAcronymUppercase = getAcronym(courseUser.course.name);

    const data = {
      course: courseUser.completed ? PROGRESS_STATUS.COMPLETED : PROGRESS_STATUS.STARTED,
      sessions: (courseUser.sessionUser ?? [])
        .filter((su) => !!su?.session)
        .map(
          (sessionUser) =>
            `${getAcronym(sessionUser.session.name)}:${sessionUser.completed ? 'C' : 'S'}`,
        )
        .join('; '),
    };

    const frontChatSchema = {
      [`course_${courseAcronymLowercase}`]: data.course,
      [`course_${courseAcronymLowercase}_sessions`]: data.sessions,
    };

    const mailchimpSchema = {
      merge_fields: {
        [`C_${courseAcronymUppercase}`]: data.course,
        [`C_${courseAcronymUppercase}_S`]: data.sessions,
      },
    } as ListMemberPartial;

    return { frontChatSchema, mailchimpSchema };
  }
}
