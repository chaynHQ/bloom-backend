import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  batchCreateMailchimpProfiles,
  createMailchimpMergeField,
  createMailchimpProfile,
  updateMailchimpProfile,
} from 'src/api/mailchimp/mailchimp-api';
import {
  ListMemberPartial,
  MAILCHIMP_MERGE_FIELD_TYPES,
} from 'src/api/mailchimp/mailchimp-api.interfaces';
import { CrispService } from 'src/crisp/crisp.service';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { UserEntity } from 'src/entities/user.entity';
import { And, Raw, Repository } from 'typeorm';
import {
  PROGRESS_STATUS,
  SIMPLYBOOK_ACTION_ENUM,
  mailchimpMarketingPermissionId,
} from '../utils/constants';
import { getAcronym } from '../utils/utils';

// Functionality for syncing user profiles for Crisp and Mailchimp communications services.
// User data must be serialized to handle service-specific data structure and different key names
// due to mailchimp field name restrictions allowing only max 10 uppercase characters

// Note errors are not thrown to prevent the more important calling functions from failing
// Instead log errors which are also captured by rollbar error reporting
const logger = new Logger('ServiceUserProfiles');

@Injectable()
export class ServiceUserProfilesService {
  constructor(
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
    private crispService: CrispService,
  ) {}

  async createServiceUserProfiles(
    user: UserEntity,
    partner?: PartnerEntity | null,
    partnerAccess?: PartnerAccessEntity | null,
  ) {
    const { email } = user;
    try {
      const userData = this.serializeUserData(user);

      const partnerData = this.serializePartnerAccessData(
        partnerAccess ? [{ ...partnerAccess, partner }] : [],
      );

      await this.crispService.createCrispProfile({
        email: email,
        person: { nickname: user.name, locales: [user.signUpLanguage || 'en'] },
        segments: this.serializeCrispPartnerSegments(partner ? [partner] : []),
      });

      const userSignedUpAt = user.createdAt?.toISOString();

      await this.crispService.updateCrispPeopleData(
        {
          signed_up_at: userSignedUpAt,
          ...userData.crispSchema,
          ...partnerData.crispSchema,
        },
        email,
      );

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

      logger.log(`Create user: updated service user profiles. User: ${email}`);
    } catch (error) {
      logger.error(`Create service user profiles error - ${error}. User: ${email}`);
    }
  }

  async updateServiceUserProfilesUser(
    user: UserEntity,
    isCrispBaseUpdateRequired: boolean,
    isEmailUpdateRequired: boolean,
    existingEmail: string,
  ) {
    const email = isEmailUpdateRequired ? user.email : existingEmail;

    try {
      if (isCrispBaseUpdateRequired) {
        // Extra call required to update crisp "base" profile when name or sign up language is changed
        await this.crispService.updateCrispProfileBase(
          {
            ...(isEmailUpdateRequired && { email: email }),
            person: {
              nickname: user.name,
              locales: [user.signUpLanguage || 'en'],
            },
          },
          existingEmail,
        );
      }

      const userData = this.serializeUserData(user);
      await this.crispService.updateCrispPeopleData(userData.crispSchema, email);
      await updateMailchimpProfile(
        {
          ...userData.mailchimpSchema,
          ...(isEmailUpdateRequired && { email_address: email }),
        },
        existingEmail,
      );
      logger.log(`Updated service user profiles user. Email: ${email}`);
    } catch (error) {
      if (error.toString() === 'Error: Not found') {
        // mailchimp account not found, create one
        const userWithRelations = await this.userRepository.findOne({
          where: { id: user.id },
          relations: {
            partnerAccess: { partner: true, therapySession: true },
            courseUser: { course: true, sessionUser: { session: true } },
          },
        });
        this.createCompleteMailchimpUserProfile(userWithRelations);
        logger.log(`Created and updated service user profiles user. Email: ${email}`);
      }
      logger.error(`Update service user profiles user error - ${error}`);
    }
  }

  async updateServiceUserProfilesPartnerAccess(
    partnerAccesses: PartnerAccessEntity[],
    email: string,
  ) {
    try {
      const partners = partnerAccesses.map((pa) => pa.partner);
      await this.crispService.updateCrispProfileBase(
        {
          segments: this.serializeCrispPartnerSegments(partners),
        },
        email,
      );

      const partnerAccessData = this.serializePartnerAccessData(partnerAccesses);
      await this.crispService.updateCrispPeopleData(partnerAccessData.crispSchema, email);
      await updateMailchimpProfile(partnerAccessData.mailchimpSchema, email);
    } catch (error) {
      logger.error(`Update service user profiles partner access error - ${error}`);
    }
  }

  async updateServiceUserProfilesTherapy(partnerAccesses: PartnerAccessEntity[], email) {
    try {
      const therapyData = this.serializeTherapyData(partnerAccesses);
      await this.crispService.updateCrispPeopleData(therapyData.crispSchema, email);
      await updateMailchimpProfile(therapyData.mailchimpSchema, email);
    } catch (error) {
      logger.error(`Update service user profiles therapy error - ${error}`);
    }
  }

  async updateServiceUserProfilesCourse(courseUser: CourseUserEntity, email: string) {
    try {
      const courseData = this.serializeCourseData(courseUser);
      await this.crispService.updateCrispPeopleData(courseData.crispSchema, email);
      await updateMailchimpProfile(courseData.mailchimpSchema, email);
    } catch (error) {
      logger.error(`Update service user profiles course error - ${error}`);
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
      logger.error(`Create mailchimp course merge fields error - ${error}`);
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

  // Static bulk upload function to be used in specific cases e.g. bug prevented a subset of new users from being created
  // Currently no endpoint for this function
  // UPDATE THE FILTERS to the current requirements
  public async bulkUploadMailchimpProfiles() {
    try {
      const filterStartDate = '2023-01-01'; // UPDATE
      const filterEndDate = '2024-01-01'; // UPDATE
      const users = await this.userRepository.find({
        where: {
          // UPDATE TO ANY FILTERS
          createdAt: And(
            Raw((alias) => `${alias} >= :filterStartDate`, { filterStartDate: filterStartDate }),
            Raw((alias) => `${alias} < :filterEndDate`, { filterEndDate: filterEndDate }),
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
        `Created batch mailchimp profiles for ${users.length} users, created before ${filterStartDate}`,
      );
    } catch (error) {
      throw new Error(`Bulk upload mailchimp profiles API call failed: ${error}`);
    }
  }

  serializePartnersString(partnerAccesses: PartnerAccessEntity[]) {
    const partnersNames = partnerAccesses?.map((pa) => pa.partner.name.toLowerCase());
    const partnersString = partnersNames ? [...new Set(partnersNames)].join('; ') : '';
    return partnersString;
  }

  serializeCrispPartnerSegments(partners: PartnerEntity[]) {
    if (!partners.length) return ['public'];
    return partners.map((p) => p.name.toLowerCase());
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

    const crispSchema = {
      marketing_permission: contactPermission,
      service_emails_permission: serviceEmailsPermission,
      last_active_at: lastActiveAtString,
      email_reminders_frequency: emailRemindersFrequency,
      // Name and language handled on base level profile for crisp
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
      language: signUpLanguage || 'en',
      merge_fields: {
        NAME: name,
        LACTIVED: lastActiveAtString,
        REMINDFREQ: emailRemindersFrequency,
      },
    } as ListMemberPartial;

    return { crispSchema, mailchimpSchema };
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

    const crispSchema = {
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

    return { crispSchema, mailchimpSchema };
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

    const crispSchema = {
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

    return { crispSchema, mailchimpSchema };
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

    const crispSchema = {
      [`course_${courseAcronymLowercase}`]: data.course,
      [`course_${courseAcronymLowercase}_sessions`]: data.sessions,
    };

    const mailchimpSchema = {
      merge_fields: {
        [`C_${courseAcronymUppercase}`]: data.course,
        [`C_${courseAcronymUppercase}_S`]: data.sessions,
      },
    } as ListMemberPartial;

    return { crispSchema, mailchimpSchema };
  }
}
