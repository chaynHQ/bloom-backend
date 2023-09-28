import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { format, sub } from 'date-fns';
import startOfDay from 'date-fns/startOfDay';
import { MailchimpClient } from 'src/api/mailchimp/mailchip-api';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { CoursePartnerRepository } from 'src/course-partner/course-partner.repository';
import { CoursePartnerService } from 'src/course-partner/course-partner.service';
import { CourseRepository } from 'src/course/course.repository';
import { CourseEntity } from 'src/entities/course.entity';
import { EmailCampaignEntity } from 'src/entities/email-campaign.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { PartnerAccessRepository } from 'src/partner-access/partner-access.repository';
import { PartnerAdminRepository } from 'src/partner-admin/partner-admin.repository';
import { PartnerRepository } from 'src/partner/partner.repository';
import { PartnerService } from 'src/partner/partner.service';
import { SessionRepository } from 'src/session/session.repository';
import { UserRepository } from 'src/user/user.repository';
import { SIMPLYBOOK_ACTION_ENUM, STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';
import StoryblokClient from 'storyblok-js-client';
import {
  mockCourse,
  mockCourseStoryblokResult,
  mockPartnerAccessEntity,
  mockSession,
  mockSessionStoryblokResult,
  mockSimplybookBodyBase,
  mockTherapySessionEntity,
} from 'test/utils/mockData';
import {
  mockCoursePartnerRepositoryMethods,
  mockCourseRepositoryMethods,
  mockEmailCampaignRepositoryMethods,
  mockMailchimpClientMethods,
  mockPartnerAccessRepositoryMethods,
  mockSessionRepositoryMethods,
  mockSlackMessageClientMethods,
  mockTherapySessionRepositoryMethods,
  mockUserRepositoryMethods,
} from 'test/utils/mockedServices';
import { EmailCampaignRepository } from './email-campaign/email-campaign.repository';
import { TherapySessionRepository } from './therapy-session.repository';
import { WebhooksService } from './webhooks.service';

// Difficult to mock classes as well as node modules.
// This seemed the best approach
jest.mock('storyblok-js-client', () => {
  return jest.fn().mockImplementation(() => {
    return {
      get: async () => mockSessionStoryblokResult,
    };
  });
});
jest.mock('src/api/simplybook/simplybook-api', () => {
  return {
    getBookingsForDate: async () => [
      {
        bookingCode: 'bookingCodeA',
        clientEmail: 'ellie@chayn.co',
        date: new Date(2022, 9, 10),
      },
    ],
    getAuthToken: async () => {
      return 'token';
    },
  };
});
jest.mock('../api/crisp/crisp-api', () => {
  return {
    updateCrispProfileData: () => {
      return;
    },
    getCrispPeopleData: () => {
      return {
        error: false,
        reason: undefined,
        data: {
          data: {
            data: {
              therapy_sessions_remaining: 10,
              therapy_sessions_redeemed: 10,
            },
          },
        },
      };
    },
  };
});

describe('WebhooksService', () => {
  let service: WebhooksService;
  const mockedMailchimpClient = createMock<MailchimpClient>(mockMailchimpClientMethods);
  const mockedSessionRepository = createMock<SessionRepository>(mockSessionRepositoryMethods);
  const mockedCourseRepository = createMock<CourseRepository>(mockCourseRepositoryMethods);
  const mockedCoursePartnerService = createMock<CoursePartnerService>(
    mockCoursePartnerRepositoryMethods,
  );
  const mockedUserRepository = createMock<UserRepository>(mockUserRepositoryMethods);
  const mockedTherapySessionRepository = createMock<TherapySessionRepository>(
    mockTherapySessionRepositoryMethods,
  );
  const mockedSlackMessageClient = createMock<SlackMessageClient>(mockSlackMessageClientMethods);
  const mockedPartnerAccessRepository = createMock<PartnerAccessRepository>(
    mockPartnerAccessRepositoryMethods,
  );
  const mockedEmailCampaignRepository = createMock<EmailCampaignRepository>(
    mockEmailCampaignRepositoryMethods,
  );

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: PartnerAccessRepository, useValue: mockedPartnerAccessRepository },
        {
          provide: UserRepository,
          useValue: mockedUserRepository,
        },
        {
          provide: CourseRepository,
          useValue: mockedCourseRepository,
        },
        {
          provide: SessionRepository,
          useValue: mockedSessionRepository,
        },
        {
          provide: CoursePartnerService,
          useValue: mockedCoursePartnerService,
        },
        {
          provide: TherapySessionRepository,
          useValue: mockedTherapySessionRepository,
        },
        {
          provide: MailchimpClient,
          useValue: mockedMailchimpClient,
        },
        CoursePartnerRepository,
        PartnerService,
        PartnerRepository,
        PartnerAdminRepository,
        EmailCampaignRepository,
        {
          provide: SlackMessageClient,
          useValue: mockedSlackMessageClient,
        },
        { provide: EmailCampaignRepository, useValue: mockedEmailCampaignRepository },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateStory', () => {
    it('when story does not exist, it returns with a 404', async () => {
      // unfortunately it is mega hard to mock classes that are also node modules and this was
      // the only solution i got working
      // eslint-disable-next-line
      // @ts-ignore
      StoryblokClient.mockImplementationOnce(() => {
        return {
          get: async () => {
            throw new Error('STORYBLOK STORY NOT FOUND');
          },
        };
      });
      expect.assertions(1);

      return expect(
        service.updateStory({
          action: STORYBLOK_STORY_STATUS_ENUM.DELETED,
          story_id: mockSession.storyblokId,
          text: '',
        }),
      ).rejects.toThrowError('STORYBLOK STORY NOT FOUND');
    });

    it('when action is deleted, story should be set as deleted in database', async () => {
      const deletedStory = (await service.updateStory({
        action: STORYBLOK_STORY_STATUS_ENUM.DELETED,
        story_id: mockSession.storyblokId,
        text: '',
      })) as SessionEntity;
      expect(deletedStory.status).toBe(STORYBLOK_STORY_STATUS_ENUM.DELETED);
    });

    it('when action is unpublished, story should be set as unpublished in database', async () => {
      const unpublished = (await service.updateStory({
        action: STORYBLOK_STORY_STATUS_ENUM.UNPUBLISHED,
        story_id: mockSession.storyblokId,
        text: '',
      })) as SessionEntity;
      expect(unpublished.status).toBe(STORYBLOK_STORY_STATUS_ENUM.UNPUBLISHED);
    });

    it('when a session has moved to a different course, the course should be updated', async () => {
      const course2 = {
        ...mockCourse,
        id: 'courseId2',
        storyblokUuid: 'anotherCourseUuid',
      };

      // eslint-disable-next-line
      // @ts-ignore
      StoryblokClient.mockImplementationOnce(() => {
        return {
          get: async () => {
            return {
              ...mockSessionStoryblokResult,
              data: {
                story: {
                  ...mockSessionStoryblokResult.data.story,
                  content: {
                    ...mockSessionStoryblokResult.data.story.content,
                    course: 'anotherCourseUuId',
                  },
                },
              },
            };
          },
        };
      });

      const sessionSaveRepoSpy = jest.spyOn(mockedSessionRepository, 'save');
      const sessionFindOneRepoSpy = jest.spyOn(mockedSessionRepository, 'findOne');

      const courseFindOneSpy = jest
        .spyOn(mockedCourseRepository, 'findOne')
        .mockImplementationOnce(async () => {
          return course2;
        });

      const session = (await service.updateStory({
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        story_id: mockCourse.storyblokId,
        text: '',
      })) as SessionEntity;

      expect(courseFindOneSpy).toBeCalledWith({
        storyblokUuid: 'anotherCourseUuId',
      });

      expect(session).toEqual({
        ...mockSession,
        course: course2,
        courseId: 'courseId2',
      });

      expect(sessionSaveRepoSpy).toBeCalledWith({
        ...mockSession,
        courseId: 'courseId2',
        course: course2,
      });

      expect(sessionFindOneRepoSpy).toBeCalledWith({
        storyblokId: mockSession.storyblokId,
      });

      courseFindOneSpy.mockClear();
      sessionSaveRepoSpy.mockClear();
      sessionFindOneRepoSpy.mockClear();
    });

    it('when a session is new, the session should be created', async () => {
      const sessionSaveRepoSpy = jest.spyOn(mockedSessionRepository, 'save');

      const sessionCreateRepoSpy = jest.spyOn(mockedSessionRepository, 'create');
      const sessionFindOneRepoSpy = jest
        .spyOn(mockedSessionRepository, 'findOne')
        .mockImplementationOnce(async () => undefined);

      const courseFindOneSpy = jest.spyOn(mockedCourseRepository, 'findOne');

      const session = (await service.updateStory({
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        story_id: mockSession.storyblokId,
        text: '',
      })) as SessionEntity;

      expect(session).toEqual(mockSession);
      expect(courseFindOneSpy).toBeCalledWith({
        storyblokUuid: 'courseUuid1',
      });
      expect(sessionSaveRepoSpy).toBeCalledWith({
        ...mockSession,
      });
      expect(sessionSaveRepoSpy).toBeCalledWith({
        ...mockSession,
      });
      expect(sessionFindOneRepoSpy).toBeCalledWith({
        storyblokId: mockSession.storyblokId,
      });

      courseFindOneSpy.mockClear();
      sessionSaveRepoSpy.mockClear();
      sessionFindOneRepoSpy.mockClear();
      sessionCreateRepoSpy.mockClear();
    });

    it('when a session with session_iba type is new, the session should be created', async () => {
      const sessionSaveRepoSpy = jest.spyOn(mockedSessionRepository, 'save');

      const sessionCreateRepoSpy = jest.spyOn(mockedSessionRepository, 'create');
      const sessionFindOneRepoSpy = jest
        .spyOn(mockedSessionRepository, 'findOne')
        .mockImplementationOnce(async () => undefined);

      const courseFindOneSpy = jest.spyOn(mockedCourseRepository, 'findOne');

      // eslint-disable-next-line
      // @ts-ignore
      StoryblokClient.mockImplementationOnce(() => {
        return {
          get: async () => {
            return {
              ...mockSessionStoryblokResult,
              data: {
                story: {
                  ...mockSessionStoryblokResult.data.story,
                  content: {
                    ...mockSessionStoryblokResult.data.story.content,
                    component: 'session_iba',
                  },
                },
              },
            };
          },
        };
      });
      const session = (await service.updateStory({
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        story_id: mockSession.storyblokId,
        text: '',
      })) as SessionEntity;

      expect(session).toEqual(mockSession);
      expect(sessionSaveRepoSpy).toBeCalledWith({
        ...mockSession,
      });

      courseFindOneSpy.mockClear();
      sessionSaveRepoSpy.mockClear();
      sessionFindOneRepoSpy.mockClear();
      sessionCreateRepoSpy.mockClear();
    });

    it('when a course is new, the course should be created', async () => {
      const courseFindOneRepoSpy = jest
        .spyOn(mockedCourseRepository, 'findOne')
        .mockImplementationOnce(async () => undefined);
      const courseCreateRepoSpy = jest.spyOn(mockedCourseRepository, 'create');
      const courseSaveRepoSpy = jest.spyOn(mockedCourseRepository, 'save');

      // eslint-disable-next-line
      // @ts-ignore
      StoryblokClient.mockImplementationOnce(() => {
        return {
          get: async () => mockCourseStoryblokResult,
        };
      });
      const course = (await service.updateStory({
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        story_id: 5678,
        text: '',
      })) as CourseEntity;

      expect(course).toEqual(mockCourse);
      expect(courseFindOneRepoSpy).toBeCalledWith({
        storyblokId: mockCourseStoryblokResult.data.story.id,
      });

      expect(courseCreateRepoSpy).toBeCalledWith({
        storyblokId: mockCourseStoryblokResult.data.story.id,
        name: mockCourseStoryblokResult.data.story.name,
        status: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        slug: mockCourseStoryblokResult.data.story.full_slug,
        storyblokUuid: mockCourseStoryblokResult.data.story.uuid,
      });

      expect(courseSaveRepoSpy).toBeCalledWith(mockCourse);

      courseFindOneRepoSpy.mockClear();
      courseCreateRepoSpy.mockClear();
      courseSaveRepoSpy.mockClear();
    });
  });
  describe('updatePartnerAccessTherapy', () => {
    it('should update the booking time when action is update and time is different TODO ', async () => {
      const newStartTime = '2022-09-12T09:30:00+0000';
      const newEndTime = '2022-09-12T10:30:00+0000';
      const therapyRepoFindOneSpy = jest.spyOn(mockedTherapySessionRepository, 'findOne');
      const booking = await service.updatePartnerAccessTherapy({
        ...mockSimplybookBodyBase,
        start_date_time: newStartTime,
        end_date_time: newEndTime,
        action: SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING,
      });
      expect(booking).toHaveProperty('startDateTime', new Date(newStartTime));
      expect(booking).toHaveProperty('endDateTime', new Date(newEndTime));
      expect(therapyRepoFindOneSpy).toBeCalled();
    });

    it('should throw when action is on a user that doesnt  exist', async () => {
      const userFindOneRepoSpy = jest
        .spyOn(mockedUserRepository, 'findOne')
        .mockImplementationOnce(() => undefined);
      await expect(service.updatePartnerAccessTherapy(mockSimplybookBodyBase)).rejects.toThrowError(
        'Unable to find user',
      );
      expect(userFindOneRepoSpy).toBeCalled();
    });

    it('should set a booking as cancelled when action is cancel', async () => {
      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          ...{ action: SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING },
        }),
      ).resolves.toHaveProperty('action', SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING);
    });
    it('should set a booking as cancelled when action is cancel and there are no therapy sessions remaining TODO', async () => {
      // mock that there is no therapy sessions remaining on partner access
      const partnerAccessFindSpy = jest
        .spyOn(mockedPartnerAccessRepository, 'find')
        .mockImplementationOnce(async () => {
          return [{ ...mockPartnerAccessEntity, therapySessionsRemaining: 0 }];
        });
      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          ...{ action: SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING },
        }),
      ).resolves.toHaveProperty('action', SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING);
      expect(partnerAccessFindSpy).toBeCalled();
    });

    it('should throw if no partnerAccess exists when user tries to create a booking', async () => {
      jest.spyOn(mockedPartnerAccessRepository, 'find').mockImplementationOnce(async () => {
        return [];
      });
      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          ...{ action: SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING },
        }),
      ).rejects.toThrow('Unable to find partner access');
    });
    it('should deduct therapyRemaining when user creates a new booking', async () => {
      jest.spyOn(mockedPartnerAccessRepository, 'find').mockImplementationOnce(async () => {
        return [
          { ...mockPartnerAccessEntity, therapySessionsRemaining: 6, therapySessionsRedeemed: 0 },
        ];
      });

      const partnerAccessSaveSpy = jest.spyOn(mockedPartnerAccessRepository, 'save');
      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          ...{ action: SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING },
        }),
      ).resolves.toHaveProperty('action', SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING);
      expect(partnerAccessSaveSpy).toBeCalledWith(mockPartnerAccessEntity);
    });
    it('should not update partner access when user updates booking', async () => {
      const partnerAccessSaveSpy = jest.spyOn(mockedPartnerAccessRepository, 'save');
      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          ...{ action: SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING },
        }),
      ).resolves.toHaveProperty('action', SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING);
      expect(partnerAccessSaveSpy).toBeCalledTimes(0);
    });
    it('should error if user creates booking when no therapy sessions remaining ', async () => {
      jest.spyOn(mockedPartnerAccessRepository, 'find').mockImplementationOnce(async () => {
        return [
          {
            ...mockPartnerAccessEntity,
            therapySessionsRemaining: 0,
            therapySessionsRedeemed: 6,
          },
        ];
      });

      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          ...{ action: SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING },
        }),
      ).rejects.toThrowError('No therapy sessions remaining');
    });
    it('if user has 2 partner access codes and booking is tied to second code, user should be able to update booking', async () => {
      jest.spyOn(mockedPartnerAccessRepository, 'find').mockImplementationOnce(async () => {
        return [
          {
            ...mockPartnerAccessEntity,
            id: 'partnerAccessId1',
            partnerId: 'partnerId1',
            therapySessionsRemaining: 6,
            therapySessionsRedeemed: 0,
          },
          {
            ...mockPartnerAccessEntity,
            id: 'partnerAccessId2',
            partnerId: 'partnerId2',
            therapySessionsRemaining: 6,
            therapySessionsRedeemed: 0,
          },
        ];
      });
      const therapySessionFindOneSpy = jest
        .spyOn(mockedTherapySessionRepository, 'findOne')
        .mockImplementationOnce(async (args: any) => {
          // if statement to ensure the two partner access Ids are passed
          if (args.where?.filter((el) => el.partnerAccessId).length === 2) {
            return { ...mockTherapySessionEntity, partnerAccessId: 'partnerAccessId2' };
          } else {
            throw new Error('Unable to find therapy session');
          }
        });

      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          ...{ action: SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING },
        }),
      ).resolves.toHaveProperty('action', SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING);
      expect(therapySessionFindOneSpy).toBeCalledTimes(1);
    });
  });
  describe('sendFirstTherapySessionFeedbackEmail', () => {
    it('should send email to those with bookings yesterday', async () => {
      jest.spyOn(mockedEmailCampaignRepository, 'find').mockImplementationOnce(async () => {
        return [];
      });
      const sentEmails = await service.sendFirstTherapySessionFeedbackEmail();
      expect(sentEmails).toBe(
        `First therapy session feedback emails sent to 1 client(s) for date: ${format(
          sub(new Date(), { days: 1 }),
          'dd/MM/yyyy',
        )}`,
      );
    });

    it('should send email to only those who have not recieved an email already', async () => {
      // Mocking that email campaign entry already exists
      jest.spyOn(mockedEmailCampaignRepository, 'find').mockImplementationOnce(async () => {
        return [{} as EmailCampaignEntity];
      });
      const saveSpy = jest.spyOn(mockedEmailCampaignRepository, 'save');

      const mailChimpSpy = jest.spyOn(mockedMailchimpClient, 'sendTherapyFeedbackEmail');
      const sentEmails = await service.sendFirstTherapySessionFeedbackEmail();
      expect(sentEmails).toBe(
        `First therapy session feedback emails sent to 0 client(s) for date: ${format(
          sub(new Date(), {
            days: 1,
          }),
          'dd/MM/yyyy',
        )}`,
      );
      await expect(mailChimpSpy).toBeCalledTimes(0);
      await expect(saveSpy).toBeCalledTimes(0);
    });
    it('should only send bookings to those who have signed up in english', async () => {
      jest.spyOn(mockedEmailCampaignRepository, 'find').mockImplementationOnce(async () => {
        return [];
      });
      jest
        .spyOn(mockedTherapySessionRepository, 'findOneOrFail')
        .mockImplementationOnce(async () => {
          return { ...mockTherapySessionEntity, user: { signUpLanguage: 'fr' } as UserEntity };
        });
      const sentEmails = await service.sendFirstTherapySessionFeedbackEmail();
      expect(sentEmails).toBe(
        `First therapy session feedback emails sent to 0 client(s) for date: ${format(
          sub(new Date(), { days: 1 }),
          'dd/MM/yyyy',
        )}`,
      );
    });
  });
  describe('sendImpactMeasurementEmail', () => {
    it('should send email to those with bookings yesterday', async () => {
      const startDate = sub(startOfDay(new Date()), { days: 180 });
      const endDate = sub(startOfDay(new Date()), { days: 173 });
      const mailChimpSpy = jest.spyOn(mockedMailchimpClient, 'sendImpactMeasurementEmail');
      const emailCampaignRepositorySpy = jest.spyOn(mockedEmailCampaignRepository, 'save');
      // Mock that there are no emails in campaign repository
      const emailCampaignRepositoryFindSpy = jest
        .spyOn(mockedEmailCampaignRepository, 'find')
        .mockImplementationOnce(async () => {
          return [];
        })
        .mockImplementationOnce(async () => {
          return [];
        });
      const sentEmails = await service.sendImpactMeasurementEmail();
      expect(sentEmails).toBe(
        `Impact feedback email sent to ${2} users who created their account between ${format(
          startDate,
          'dd/MM/yyyy',
        )} - ${format(endDate, 'dd/MM/yyyy')}`,
      );
      expect(mailChimpSpy).toBeCalledTimes(2);
      expect(emailCampaignRepositorySpy).toBeCalledTimes(2);
      expect(emailCampaignRepositoryFindSpy).toBeCalledTimes(2);
    });

    it('if error occurs for saving entry in campaign repository for one user, loop continues and error is logged', async () => {
      const startDate = sub(startOfDay(new Date()), { days: 180 });
      const endDate = sub(startOfDay(new Date()), { days: 173 });
      const mailChimpSpy = jest.spyOn(mockedMailchimpClient, 'sendImpactMeasurementEmail');
      const emailCampaignRepositorySpy = jest
        .spyOn(mockedEmailCampaignRepository, 'save')
        .mockImplementationOnce(async () => {
          throw new Error('Failed to save');
        });
      const emailCampaignRepositoryFindSpy = jest
        .spyOn(mockedEmailCampaignRepository, 'find')
        .mockImplementationOnce(async () => {
          return [];
        })
        .mockImplementationOnce(async () => {
          return [];
        });
      const sentEmails = await service.sendImpactMeasurementEmail();
      expect(sentEmails).toBe(
        `Impact feedback email sent to ${2} users who created their account between ${format(
          startDate,
          'dd/MM/yyyy',
        )} - ${format(endDate, 'dd/MM/yyyy')}`,
      );
      expect(mailChimpSpy).toBeCalledTimes(2);
      expect(emailCampaignRepositorySpy).toBeCalledTimes(2);
      expect(emailCampaignRepositoryFindSpy).toBeCalledTimes(2);
    });

    it('if error occurs for sending email for one user, loop continues', async () => {
      const startDate = sub(startOfDay(new Date()), { days: 180 });
      const endDate = sub(startOfDay(new Date()), { days: 173 });
      const mailChimpSpy = jest
        .spyOn(mockedMailchimpClient, 'sendImpactMeasurementEmail')
        .mockImplementationOnce(async () => {
          throw new Error();
        });
      const emailCampaignRepositorySpy = jest.spyOn(mockedEmailCampaignRepository, 'save');
      const emailCampaignRepositoryFindSpy = jest
        .spyOn(mockedEmailCampaignRepository, 'find')
        .mockImplementationOnce(async () => {
          return [];
        })
        .mockImplementationOnce(async () => {
          return [];
        });
      const sentEmails = await service.sendImpactMeasurementEmail();
      expect(sentEmails).toBe(
        `Impact feedback email sent to ${1} users who created their account between ${format(
          startDate,
          'dd/MM/yyyy',
        )} - ${format(endDate, 'dd/MM/yyyy')}`,
      );
      expect(mailChimpSpy).toBeCalledTimes(2);
      expect(emailCampaignRepositorySpy).toBeCalledTimes(1);
      expect(emailCampaignRepositoryFindSpy).toBeCalledTimes(2);
    });
    it('if a user has already been sent an email, no second email is sent', async () => {
      const startDate = sub(startOfDay(new Date()), { days: 180 });
      const endDate = sub(startOfDay(new Date()), { days: 173 });
      const emailCampaignRepositorySpy = jest.spyOn(mockedEmailCampaignRepository, 'save');
      const emailCampaignRepositoryFindSpy = jest
        .spyOn(mockedEmailCampaignRepository, 'find')
        .mockImplementationOnce(async () => {
          return [];
        })
        .mockImplementationOnce(async () => {
          // Mocking that one already has been sent to the user
          return [{} as EmailCampaignEntity];
        });

      const sentEmails = await service.sendImpactMeasurementEmail();
      expect(sentEmails).toBe(
        `Impact feedback email sent to ${1} users who created their account between ${format(
          startDate,
          'dd/MM/yyyy',
        )} - ${format(endDate, 'dd/MM/yyyy')}`,
      );
      expect(emailCampaignRepositorySpy).toBeCalledTimes(1);
      expect(emailCampaignRepositoryFindSpy).toBeCalledTimes(2);
    });

    it('if error occurs fetching users, error is thrown', async () => {
      jest.spyOn(mockedUserRepository, 'find').mockImplementationOnce(async () => {
        throw new Error('Failed to save');
      });
      await expect(service.sendImpactMeasurementEmail()).rejects.toThrowError(
        'SendImpactMeasurementEmail - Unable to fetch user',
      );
    });
  });
});
