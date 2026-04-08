import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  batchCreateMailchimpProfiles,
  batchUpdateMailchimpProfiles,
  createMailchimpMergeField,
  createMailchimpProfile,
  updateMailchimpProfile,
} from 'src/api/mailchimp/mailchimp-api';
import {
  ListMemberPartial,
  MAILCHIMP_MERGE_FIELD_TYPES,
} from 'src/api/mailchimp/mailchimp-api.interfaces';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { UserEntity } from 'src/entities/user.entity';
import { FrontChatService } from 'src/front-chat/front-chat.service';
import { Logger } from 'src/logger/logger';
import { And, Raw, Repository } from 'typeorm';
import {
  LANGUAGE_DEFAULT,
  PROGRESS_STATUS,
  SIMPLYBOOK_ACTION_ENUM,
  mailchimpMarketingPermissionId,
} from '../utils/constants';
import { getAcronym, isCypressTestEmail } from '../utils/utils';

// Functionality for syncing user profiles for Front Chat and Mailchimp communications services.
// User data must be serialized to handle service-specific data structure and different key names
// due to mailchimp field name restrictions allowing only max 10 uppercase characters

// Note errors are not thrown to prevent the more important calling functions from failing
// Instead log errors which are also captured by rollbar error reporting
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
    const partnerData = this.serializePartnerAccessData(
      partnerAccess ? [{ ...partnerAccess, partner }] : [],
    );
    const userSignedUpAt = user.createdAt?.toISOString();

    try {
      await this.frontChatService.createContact({
        email: email,
        name: user.name,
      });

      await this.frontChatService.updateContactCustomFields(
        {
          signed_up_at: userSignedUpAt,
          ...userData.frontChatSchema,
          ...partnerData.frontChatSchema,
        },
        email,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      logger.error(`Create Crisp user profile error: ${message}`);
    }

    try {
      const mailchimpMergeFields = {
        SIGNUPD: userSignedUpAt,
        ...userData.mailchimpSchema.merge_fields,
        ...partnerData.mailchimpSchema.merge_fields,
      };

      await createMailchimpProfile({
        email_address: email,
        ...userData.mailchimpSchema,
        ...partnerData.mailchimpSchema,
        merge_fields: mailchimpMergeFields,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      logger.error(`Create Mailchimp user profile error: ${message}`);
    }

    logger.log('Create user: updated service user profiles');
  }

  async updateServiceUserProfilesUser(
    user: UserEntity,
    isProfileUpdateRequired: boolean,
    isEmailUpdateRequired: boolean,
    existingEmail: string,
  ) {
    const email = isEmailUpdateRequired ? user.email : existingEmail;

    if (isCypressTestEmail(email) || isCypressTestEmail(existingEmail)) {
      logger.log('Skipping service user profile update for Cypress test email');
      return;
    }

    const userData = this.serializeUserData(user);

    try {
      if (isProfileUpdateRequired) {
        // Extra call required to update contact profile when name or sign up language is changed
        await this.frontChatService.updateContactProfile(
          {
            ...(isEmailUpdateRequired && { email: email }),
            name: user.name,
          },
          existingEmail,
        );
      }

      await this.frontChatService.updateContactCustomFields(userData.frontChatSchema, email);
      await updateMailchimpProfile(
        {
          ...userData.mailchimpSchema,
          ...(isEmailUpdateRequired && { email_address: email }),
        },
        existingEmail,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      logger.error(`Update Mailchimp user profile error - ${message}`);
    }

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

    try {
      await this.frontChatService.updateContactCustomFields(
        partnerAccessData.frontChatSchema,
        email,
      );
      await updateMailchimpProfile(partnerAccessData.mailchimpSchema, email);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      logger.error(`Update Mailchimp partner access error - ${message}`);
    }
  }

  async updateServiceUserProfilesTherapy(partnerAccesses: PartnerAccessEntity[], email) {
    if (isCypressTestEmail(email)) {
      logger.log('Skipping service user profile therapy update for Cypress test email');
      return;
    }

    const therapyData = this.serializeTherapyData(partnerAccesses);

    try {
      await this.frontChatService.updateContactCustomFields(therapyData.frontChatSchema, email);
      await updateMailchimpProfile(therapyData.mailchimpSchema, email);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      logger.error(`Update Mailchimp therapy error - ${message}`);
    }
  }

  async updateServiceUserProfilesCourse(courseUser: CourseUserEntity, email: string) {
    if (isCypressTestEmail(email)) {
      logger.log('Skipping service user profile course update for Cypress test email');
      return;
    }

    const courseData = this.serializeCourseData(courseUser);

    try {
      await this.frontChatService.updateContactCustomFields(courseData.frontChatSchema, email);
      await updateMailchimpProfile(courseData.mailchimpSchema, email);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      logger.error(`Update Mailchimp course error - ${message}`);
    }
  }

  // Merge fields (custom fields) in mailchimp must be created before they are used
  // This function creates 2 new mailchimp merge fields for a new course
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

  // Currently only used in bulk upload function, as mailchimp profiles are typically built
  // incrementally on sign up and subsequent user actions
  createCompleteMailchimpUserProfile(user: UserEntity): ListMemberPartial {
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

    const profileData = {
      email_address: user.email,
      ...userData.mailchimpSchema,

      merge_fields: {
        SIGNUPD: user.createdAt?.toISOString(),
        ...userData.mailchimpSchema.merge_fields,
        ...partnerData.mailchimpSchema.merge_fields,
        ...therapyData.mailchimpSchema.merge_fields,
        ...courseData,
      },
    };
    return profileData;
  }

  // Bulk upload function to be used in specific cases e.g. bug prevented a subset of new users from being created
  // Filters by createdAt date range
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

  // Bulk update function to be used in specific cases e.g. bug prevented a subset of users from being updated
  // Filters by updatedAt date range, excluding users created after startDate
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
    const lastActiveAtString = lastActiveAt?.toISOString() || '';

    const frontChatSchema = {
      marketing_permission: contactPermission,
      service_emails_permission: serviceEmailsPermission,
      last_active_at: lastActiveAtString,
      email_reminders_frequency: emailRemindersFrequency,
      // Name and language handled on base level contact profile for Front Chat
    };

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
          featureLiveChat: !!partnerAccesses.find((pa) => pa.featureLiveChat) || true,
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
    const therapySessions = partnerAccesses
      .flatMap((partnerAccess) => partnerAccess.therapySession)
      .filter(
        (therapySession) => therapySession.action !== SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING,
      )
      .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());

    const pastTherapySessions = therapySessions.filter(
      (therapySession) => therapySession.startDateTime.getTime() < new Date().getTime(),
    );
    const futureTherapySessions = therapySessions.filter(
      (therapySession) => therapySession.startDateTime.getTime() > new Date().getTime(),
    );

    const firstTherapySessionAt = therapySessions?.at(0)?.startDateTime.toISOString() || '';

    const lastTherapySessionAt = pastTherapySessions?.at(-1)?.startDateTime.toISOString() || '';

    const nextTherapySessionAt = futureTherapySessions?.at(0)?.startDateTime.toISOString() || '';

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
      sessions: courseUser.sessionUser
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
