/* eslint-disable */
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMailchimpProfile, updateMailchimpProfile } from 'src/api/mailchimp/mailchimp-api';
import { CrispService } from 'src/crisp/crisp.service';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { SubscriptionUserService } from 'src/subscription-user/subscription-user.service';
import { TherapySessionService } from 'src/therapy-session/therapy-session.service';
import { EMAIL_REMINDERS_FREQUENCY, PartnerAccessCodeStatusEnum } from 'src/utils/constants';
import {
  mockIFirebaseUser,
  mockPartnerAccessEntity,
  mockPartnerEntity,
  mockTherapySessionDto,
  mockUserEntity,
  mockUserRecord,
} from 'test/utils/mockData';
import {
  mockAuthServiceMethods,
  mockClsService,
  mockPartnerAccessRepositoryMethods,
  mockPartnerRepositoryMethods,
  mockUserRepositoryMethodsFactory,
} from 'test/utils/mockedServices';
import { Repository } from 'typeorm';
import { createQueryBuilderMock } from '../../test/utils/mockUtils';
import { AuthService } from '../auth/auth.service';
import { UserEntity } from '../entities/user.entity';
import { Logger } from '../logger/logger';
import { PartnerAccessService } from '../partner-access/partner-access.service';
import { AdminUpdateUserDto } from './dtos/admin-update-user.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserService } from './user.service';

const createUserDto: CreateUserDto = {
  email: 'user@email.com',
  password: 'password',
  name: 'name',
  contactPermission: false,
  serviceEmailsPermission: true,
  emailRemindersFrequency: EMAIL_REMINDERS_FREQUENCY.TWO_MONTHS,
  signUpLanguage: 'en',
};

const updateUserDto: Partial<UpdateUserDto> = {
  name: 'new name',
  contactPermission: true,
  serviceEmailsPermission: false,
  signUpLanguage: 'en',
  email: 'newemail@chayn.co',
};

const mockSubscriptionUserServiceMethods = {};
const mockTherapySessionServiceMethods = {};
const mockCrispServiceMethods = {};

jest.mock('src/api/mailchimp/mailchimp-api');

describe('UserService', () => {
  let service: UserService;
  let repo: Repository<UserEntity>;
  let mockAuthService: DeepMocked<AuthService>;
  let mockPartnerAccessService: DeepMocked<PartnerAccessService>;
  let mockSubscriptionUserService: DeepMocked<SubscriptionUserService>;
  let mockTherapySessionService: DeepMocked<TherapySessionService>;
  let mockCrispService: DeepMocked<CrispService>;
  let mockEventLoggerService: DeepMocked<EventLoggerService>;
  let mockEventLogRepository: DeepMocked<Repository<EventLogEntity>>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAuthService = createMock<AuthService>(mockAuthServiceMethods);
    mockPartnerAccessService = createMock<PartnerAccessService>();
    mockSubscriptionUserService = createMock<SubscriptionUserService>(
      mockSubscriptionUserServiceMethods,
    );
    mockTherapySessionService = createMock<TherapySessionService>(mockTherapySessionServiceMethods);
    mockCrispService = createMock<CrispService>(mockCrispServiceMethods);
    mockEventLoggerService = createMock<EventLoggerService>();
    mockEventLogRepository = createMock<Repository<EventLogEntity>>(mockEventLogRepository);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(UserEntity),
          useFactory: jest.fn(() => mockUserRepositoryMethodsFactory),
        },
        {
          provide: getRepositoryToken(PartnerEntity),
          useFactory: jest.fn(() => mockPartnerRepositoryMethods),
        },
        {
          provide: getRepositoryToken(PartnerAccessEntity),
          useFactory: jest.fn(() => mockPartnerAccessRepositoryMethods),
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: PartnerAccessService,
          useValue: mockPartnerAccessService,
        },
        { provide: SubscriptionUserService, useValue: mockSubscriptionUserService },
        { provide: TherapySessionService, useValue: mockTherapySessionService },
        ServiceUserProfilesService,
        {
          provide: getRepositoryToken(EventLogEntity),
          useValue: mockEventLogRepository,
        },
        { provide: CrispService, useValue: mockCrispService },
        { provide: EventLoggerService, useValue: mockEventLoggerService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    const logger = (service as any).logger as Logger;
    (logger as any).cls = mockClsService;
    repo = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('when supplied with user dto and no partner access, it should return a public user', async () => {
      const repoSaveSpy = jest.spyOn(repo, 'save');

      const user = await service.createUser(createUserDto);
      expect(repoSaveSpy).toHaveBeenCalledWith({
        ...createUserDto,
        firebaseUid: mockUserRecord.uid,
        lastActiveAt: user.user.lastActiveAt,
      });

      expect(user.user.email).toBe('user@email.com');
      expect(user.partnerAdmin).toBeNull();
      expect(user.partnerAccesses).toBeNull();

      // Test services user profiles are created
      expect(mockCrispService.createCrispProfile).toHaveBeenCalledWith({
        email: user.user.email,
        person: { nickname: user.user.name, locales: [user.user.signUpLanguage] },
        segments: ['public'],
      });
      expect(mockCrispService.updateCrispPeopleData).toHaveBeenCalled();
      expect(createMailchimpProfile).toHaveBeenCalled();
    });

    it('when supplied with user dto and partner access code, it should return a new partner user', async () => {
      const repoSaveSpy = jest.spyOn(repo, 'save');
      jest
        .spyOn(mockPartnerAccessService, 'getPartnerAccessByCode')
        .mockImplementationOnce(async () => mockPartnerAccessEntity);

      const user = await service.createUser({
        ...createUserDto,
        contactPermission: true,
        partnerId: mockPartnerEntity.id,
        partnerAccessCode: mockPartnerAccessEntity.accessCode,
      });

      expect(repoSaveSpy).toHaveBeenCalled();
      expect(user.user.email).toBe('user@email.com');
      expect(user.partnerAdmin).toBeNull();

      const { therapySession, partnerAdmin, partnerAdminId, userId, ...partnerAccessData } =
        mockPartnerAccessEntity;
      expect(user.partnerAccesses).toEqual([
        { ...partnerAccessData, therapySessions: [mockTherapySessionDto] },
      ]);

      // Test services user profiles are created
      expect(mockCrispService.createCrispProfile).toHaveBeenCalledWith({
        email: user.user.email,
        person: { nickname: 'name', locales: ['en'] },
        segments: ['bumble'],
      });
      expect(mockCrispService.updateCrispPeopleData).toHaveBeenCalledWith(
        {
          signed_up_at: user.user.createdAt,
          last_active_at: (user.user.lastActiveAt as Date).toISOString(),
          marketing_permission: true,
          service_emails_permission: true,
          email_reminders_frequency: EMAIL_REMINDERS_FREQUENCY.TWO_MONTHS,
          partners: 'bumble',
          feature_live_chat: true,
          feature_therapy: true,
          therapy_sessions_remaining: 5,
          therapy_sessions_redeemed: 1,
        },
        'user@email.com',
      );
      expect(createMailchimpProfile).toHaveBeenCalled();
    });

    it('when supplied with user dto and partner access that has already been used, it should return an error', async () => {
      const userRepoSpy = jest.spyOn(repo, 'save');
      const assignCodeSpy = jest.spyOn(mockPartnerAccessService, 'assignPartnerAccess');
      jest
        .spyOn(mockPartnerAccessService, 'getPartnerAccessByCode')
        .mockImplementationOnce(async () => {
          throw new HttpException(PartnerAccessCodeStatusEnum.ALREADY_IN_USE, HttpStatus.CONFLICT);
        });
      await expect(async () => {
        await service.createUser({ ...createUserDto, partnerAccessCode: '123456' });
      }).rejects.toThrow(PartnerAccessCodeStatusEnum.ALREADY_IN_USE);
      expect(userRepoSpy).not.toHaveBeenCalled();
      expect(assignCodeSpy).not.toHaveBeenCalled();
    });

    // TODO - what do we want to happen here?
    it('when supplied with user dto and partner access that is incorrect, it should throw an error', async () => {
      const userRepoSpy = jest.spyOn(repo, 'save');
      jest
        .spyOn(mockPartnerAccessService, 'getPartnerAccessByCode')
        .mockImplementationOnce(async () => {
          throw new Error('Access code invalid');
        });
      await expect(
        service.createUser({ ...createUserDto, partnerAccessCode: 'incorrect code' }),
      ).rejects.toThrow('Access code invalid');
      expect(userRepoSpy).not.toHaveBeenCalled();
    });

    it('when supplied with user dto and partnerId but no partner access code, it should return a user with partner access', async () => {
      jest
        .spyOn(mockPartnerAccessService, 'createPartnerAccess')
        .mockResolvedValue(mockPartnerAccessEntity);

      const user = await service.createUser({
        ...createUserDto,
        partnerId: mockPartnerEntity.id,
      });

      const { therapySession, partnerAdmin, partnerAdminId, userId, ...partnerAccessData } =
        mockPartnerAccessEntity; // Note different format for the DTO

      expect(user.partnerAccesses).toEqual([
        { ...partnerAccessData, therapySessions: [mockTherapySessionDto] },
      ]);
    });

    it('should not fail create on crisp api call errors', async () => {
      const mocked = jest.mocked(mockCrispService.createCrispProfile);
      mocked.mockRejectedValue(new Error('Crisp API call failed'));

      const user = await service.createUser(createUserDto);

      expect(mocked).toHaveBeenCalled();
      expect(user.user.email).toBe('user@email.com');

      mocked.mockReset();
    });

    it('should not fail create on mailchimp api call errors', async () => {
      const mocked = jest.mocked(createMailchimpProfile);
      mocked.mockRejectedValue(new Error('Mailchimp API call failed'));

      const user = await service.createUser(createUserDto);

      expect(mocked).toHaveBeenCalled();
      expect(user.user.email).toBe('user@email.com');

      mocked.mockReset();
    });
  });

  describe('getUser', () => {
    it('when supplied a firebase user dto, it should return a user', async () => {
      const repoSpyCreateQueryBuilder = jest.spyOn(repo, 'createQueryBuilder');

      repoSpyCreateQueryBuilder
        .mockImplementation(
          createQueryBuilderMock() as never, // TODO resolve this typescript issue
        )
        .mockImplementationOnce(
          createQueryBuilderMock({
            getOne: jest.fn().mockResolvedValue(mockUserEntity),
          }) as never,
        );

      const userResponse = await service.getUserByFirebaseId(mockIFirebaseUser);
      expect(userResponse.userEntity.email).toBe('user@email.com');
      expect(userResponse.userDto.user.email).toBe('user@email.com');
      expect(userResponse.userDto.user.email).toBe('user@email.com');
      expect(userResponse.userDto.partnerAdmin).toBeNull();
      expect(userResponse.userDto.partnerAccesses).toEqual([]);
    });
  });

  describe('updateUser', () => {
    it('when supplied a firebase user dto, it should return a user', async () => {
      const repoSaveSpy = jest.spyOn(repo, 'save');
      const authServiceUpdateEmailSpy = jest.spyOn(mockAuthService, 'updateFirebaseUserEmail');

      const user = await service.updateUser(updateUserDto, mockUserEntity.id);
      expect(user.name).toBe(updateUserDto.name);
      expect(user.email).toBe(updateUserDto.email);
      expect(user.contactPermission).toBe(true);
      expect(user.serviceEmailsPermission).toBe(false);

      expect(repoSaveSpy).toHaveBeenCalledWith({ ...mockUserEntity, ...updateUserDto });
      expect(repoSaveSpy).toHaveBeenCalled();
      expect(authServiceUpdateEmailSpy).toHaveBeenCalledWith(
        mockUserEntity.firebaseUid,
        updateUserDto.email,
      );
    });

    it('when supplied a firebase user dto with an email that already exists, it should return an error', async () => {
      const authServiceUpdateEmailSpy = jest
        .spyOn(mockAuthService, 'updateFirebaseUserEmail')
        .mockImplementationOnce(async () => {
          throw new Error('Email already exists');
        });

      await expect(service.updateUser(updateUserDto, mockUserEntity.id)).rejects.toThrow(
        'Email already exists',
      );

      expect(authServiceUpdateEmailSpy).toHaveBeenCalledWith(
        mockUserEntity.firebaseUid,
        updateUserDto.email,
      );
    });

    it('should not fail update on crisp api call errors', async () => {
      const mocked = jest.mocked(mockCrispService.updateCrispPeopleData);
      mocked.mockRejectedValue(new Error('Crisp API call failed'));

      const user = await service.updateUser(updateUserDto, mockUserEntity.id);
      await new Promise(process.nextTick); // wait for async funcs to resolve
      expect(mocked).toHaveBeenCalled();
      expect(user.name).toBe(updateUserDto.name);
      expect(user.email).toBe(updateUserDto.email);
      mocked.mockReset();
    });

    it('should not fail update on mailchimp api call errors', async () => {
      const mocked = jest.mocked(updateMailchimpProfile);
      mocked.mockRejectedValue(new Error('Mailchimp API call failed'));

      const user = await service.updateUser(updateUserDto, mockUserEntity.id);
      await new Promise(process.nextTick); // wait for async funcs to resolve
      expect(mocked).toHaveBeenCalled();
      expect(user.name).toBe(updateUserDto.name);
      expect(user.email).toBe(updateUserDto.email);

      mocked.mockReset();
    });
  });

  describe('deleteUserById', () => {
    it('when user id supplied, should soft delete', async () => {
      const repoSpyCreateQueryBuilder = jest.spyOn(repo, 'createQueryBuilder');
      repoSpyCreateQueryBuilder
        .mockImplementation(
          createQueryBuilderMock() as never, // TODO resolve this typescript issue
        )
        .mockImplementationOnce(
          createQueryBuilderMock({
            getOne: jest.fn().mockResolvedValue(mockUserEntity),
          }) as never,
        );

      const repoSpySave = jest.spyOn(repo, 'save');
      const mockTherapySessionServiceSpy = jest.spyOn(
        mockTherapySessionService,
        'softDeleteTherapySessions',
      );
      const mockSubscriptionUserServiceSpy = jest.spyOn(
        mockSubscriptionUserService,
        'softDeleteSubscriptionsForUser',
      );
      const mockAuthServiceSpy = jest.spyOn(mockAuthService, 'deleteFirebaseUser');

      const user = await service.deleteUserById(mockUserEntity.id);
      expect(user.name).not.toBe(mockUserEntity.name);
      expect(user.id).toBe(mockUserEntity.id);
      expect(user.email).not.toBe(mockUserEntity.email);

      expect(repoSpySave).toHaveBeenCalled();
      expect(user.name).not.toBe(mockUserEntity.name);
      expect(user.id).toBe(mockUserEntity.id);
      expect(user.email).not.toBe(mockUserEntity.email);

      expect(repoSpySave).toHaveBeenCalled();
      expect(mockTherapySessionServiceSpy).toHaveBeenCalled();
      expect(mockSubscriptionUserServiceSpy).toHaveBeenCalledWith(
        mockUserEntity.id,
        mockUserEntity.email,
      );
      expect(mockAuthServiceSpy).toHaveBeenCalledWith(mockUserEntity.firebaseUid);
    });
  });

  describe('deleteUser', () => {
    it('when user id supplied, should soft delete', async () => {
      const repoSpyCreateQueryBuilder = jest.spyOn(repo, 'createQueryBuilder');
      repoSpyCreateQueryBuilder
        .mockImplementation(
          createQueryBuilderMock() as never, // TODO resolve this typescript issue
        )
        .mockImplementationOnce(
          createQueryBuilderMock({
            getOne: jest.fn().mockResolvedValue(mockUserEntity),
          }) as never,
        );

      const repoSpySave = jest.spyOn(repo, 'save');
      const mockTherapySessionServiceSpy = jest.spyOn(
        mockTherapySessionService,
        'softDeleteTherapySessions',
      );
      const mockSubscriptionUserServiceSpy = jest.spyOn(
        mockSubscriptionUserService,
        'softDeleteSubscriptionsForUser',
      );
      const mockAuthServiceSpy = jest.spyOn(mockAuthService, 'deleteFirebaseUser');

      const user = await service.deleteUser(mockUserEntity);
      expect(user.name).not.toBe(mockUserEntity.name);
      expect(user.id).toBe(mockUserEntity.id);
      expect(user.email).not.toBe(mockUserEntity.email);

      expect(repoSpySave).toHaveBeenCalled();
      expect(mockTherapySessionServiceSpy).toHaveBeenCalled();
      expect(mockSubscriptionUserServiceSpy).toHaveBeenCalledWith(
        mockUserEntity.id,
        mockUserEntity.email,
      );
      expect(mockAuthServiceSpy).toHaveBeenCalledWith(mockUserEntity.firebaseUid);
    });

    it('when user id supplied, but firebaseRequestFails, it should not throw', async () => {
      const repoSpyCreateQueryBuilder = jest.spyOn(repo, 'createQueryBuilder');
      repoSpyCreateQueryBuilder
        .mockImplementation(
          createQueryBuilderMock() as never, // TODO resolve this typescript issue
        )
        .mockImplementationOnce(
          createQueryBuilderMock({
            getOne: jest.fn().mockResolvedValue(mockUserEntity),
          }) as never,
        );

      const repoSpySave = jest.spyOn(repo, 'save');
      const mockTherapySessionServiceSpy = jest.spyOn(
        mockTherapySessionService,
        'softDeleteTherapySessions',
      );
      const mockSubscriptionUserServiceSpy = jest.spyOn(
        mockSubscriptionUserService,
        'softDeleteSubscriptionsForUser',
      );
      const mockAuthServiceSpy = jest
        .spyOn(mockAuthService, 'deleteFirebaseUser')
        .mockImplementationOnce(async () => {
          throw new Error('Firebase error, unable to delete firebase user');
        });

      const user = await service.deleteUser(mockUserEntity);
      expect(user.name).not.toBe(mockUserEntity.name);
      expect(user.id).toBe(mockUserEntity.id);
      expect(user.email).not.toBe(mockUserEntity.email);

      expect(repoSpySave).toHaveBeenCalledTimes(1);
      expect(mockTherapySessionServiceSpy).toHaveBeenCalledTimes(1);
      expect(mockSubscriptionUserServiceSpy).toHaveBeenCalledTimes(1);
      expect(mockAuthServiceSpy).toHaveBeenCalledWith(mockUserEntity.firebaseUid);
    });
    it('when user id supplied, but deleting subscriptions fails, it should throw with helpful error', async () => {
      const repoSpyCreateQueryBuilder = jest.spyOn(repo, 'createQueryBuilder');
      repoSpyCreateQueryBuilder
        .mockImplementation(
          createQueryBuilderMock() as never, // TODO resolve this typescript issue
        )
        .mockImplementationOnce(
          createQueryBuilderMock({
            getOne: jest.fn().mockResolvedValue(mockUserEntity),
          }) as never,
        );

      const repoSpySave = jest.spyOn(repo, 'save');
      const mockTherapySessionServiceSpy = jest.spyOn(
        mockTherapySessionService,
        'softDeleteTherapySessions',
      );
      const mockSubscriptionUserServiceSpy = jest
        .spyOn(mockSubscriptionUserService, 'softDeleteSubscriptionsForUser')
        .mockImplementationOnce(async () => {
          throw new Error(
            'Subscription deletion error, unable to redact subscriptions for user with id ' +
              mockUserEntity.id,
          );
        });
      const mockAuthServiceSpy = jest.spyOn(mockAuthService, 'deleteFirebaseUser');

      await expect(service.deleteUser(mockUserEntity)).rejects.toThrow(
        'Unable to complete deleting user, user@email.com due to error - Error: Subscription deletion error, unable to redact subscriptions for user with id userId1',
      );

      expect(repoSpySave).toHaveBeenCalledTimes(0);
      expect(mockTherapySessionServiceSpy).toHaveBeenCalledTimes(0);
      expect(mockSubscriptionUserServiceSpy).toHaveBeenCalledTimes(1);
      expect(mockAuthServiceSpy).toHaveBeenCalledWith(mockUserEntity.firebaseUid);
    });

    it('when user id supplied, but deleting therapysessions fails, it should throw with helpful error', async () => {
      const repoSpyCreateQueryBuilder = jest.spyOn(repo, 'createQueryBuilder');
      repoSpyCreateQueryBuilder
        .mockImplementation(
          createQueryBuilderMock() as never, // TODO resolve this typescript issue
        )
        .mockImplementationOnce(
          createQueryBuilderMock({
            getOne: jest.fn().mockResolvedValue(mockUserEntity),
          }) as never,
        );

      const repoSpySave = jest.spyOn(repo, 'save');
      const mockTherapySessionServiceSpy = jest
        .spyOn(mockTherapySessionService, 'softDeleteTherapySessions')
        .mockImplementationOnce(async () => {
          throw new Error(
            'Therapy deletion error, unable to redact therapy sessions for user with id ' +
              mockUserEntity.id,
          );
        });
      const mockSubscriptionUserServiceSpy = jest.spyOn(
        mockSubscriptionUserService,
        'softDeleteSubscriptionsForUser',
      );

      const mockAuthServiceSpy = jest.spyOn(mockAuthService, 'deleteFirebaseUser');

      await expect(service.deleteUser(mockUserEntity)).rejects.toThrow(
        'Unable to complete deleting user, user@email.com due to error - Error: Therapy deletion error, unable to redact therapy sessions for user with id userId1',
      );

      expect(repoSpySave).toHaveBeenCalledTimes(0);
      expect(mockTherapySessionServiceSpy).toHaveBeenCalledTimes(1);
      expect(mockSubscriptionUserServiceSpy).toHaveBeenCalledTimes(1);
      expect(mockAuthServiceSpy).toHaveBeenCalledWith(mockUserEntity.firebaseUid);
    });
  });

  // TODO - Extend getUser tests. At the moment, this is only used by super admins
  describe('getUsers', () => {
    it('getUsers', async () => {
      jest
        .spyOn(repo, 'find')
        .mockImplementationOnce(async () => [{ ...mockUserEntity, email: 'a@b.com' }]);
      const users = await service.getUsers({ email: 'a@b.com' }, [], 10);
      expect(users).toEqual([{ ...mockUserEntity, email: 'a@b.com' }]);
    });
  });

  describe('adminUpdateUser', () => {
    it("should update user's superAdmin status", async () => {
      const user = mockUserEntity;
      const userSaveSpy = jest.spyOn(repo, 'save').mockImplementationOnce(async () => {
        return user;
      });
      const updatedUser = await service.adminUpdateUser(
        { isSuperAdmin: true } as AdminUpdateUserDto,
        user.id,
      );
      expect(updatedUser).toHaveProperty('isSuperAdmin', true);
      expect(userSaveSpy).toHaveBeenCalled();
    });
  });
});
