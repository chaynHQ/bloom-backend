/* eslint-disable */
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { addCrispProfile } from 'src/api/crisp/crisp-api';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { SubscriptionUserService } from 'src/subscription-user/subscription-user.service';
import { TherapySessionService } from 'src/therapy-session/therapy-session.service';
import { FEATURES, PartnerAccessCodeStatusEnum } from 'src/utils/constants';
import {
  mockFeatureEntity,
  mockIFirebaseUser,
  mockPartnerAccessEntity,
  mockPartnerEntity,
  mockPartnerFeatureEntity,
  mockUserEntity,
  mockUserRecord,
} from 'test/utils/mockData';
import {
  mockAuthServiceMethods,
  mockPartnerServiceMethods,
  mockUserRepositoryMethodsFactory,
} from 'test/utils/mockedServices';
import { Repository } from 'typeorm';
import { createQueryBuilderMock } from '../../test/utils/mockUtils';
import { AuthService } from '../auth/auth.service';
import { UserEntity } from '../entities/user.entity';
import { PartnerAccessService } from '../partner-access/partner-access.service';
import { PartnerService } from '../partner/partner.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserService } from './user.service';

const createUserDto: CreateUserDto = {
  email: 'user@email.com',
  password: 'password',
  name: 'name',
  contactPermission: false,
  serviceEmailsPermission: true,
  signUpLanguage: 'en',
};

const createUserRepositoryDto = {
  email: 'user@email.com',
  name: 'name',
  contactPermission: false,
  serviceEmailsPermission: true,
  signUpLanguage: 'en',
  firebaseUid: mockUserRecord.uid,
};

const updateUserDto: UpdateUserDto = {
  name: 'new name',
  contactPermission: true,
  serviceEmailsPermission: false,
};

const mockPartnerWithAutomaticAccessCodeFeature = {
  ...mockPartnerEntity,
  partnerFeature: [
    {
      ...mockPartnerFeatureEntity,
      feature: { ...mockFeatureEntity, name: FEATURES.AUTOMATIC_ACCESS_CODE },
    },
  ],
};

const mockSubscriptionUserServiceMethods = {};
const mockTherapySessionServiceMethods = {};

jest.mock('src/api/crisp/crisp-api');

describe('UserService', () => {
  let service: UserService;
  let repo: Repository<UserEntity>;
  let mockPartnerService: DeepMocked<PartnerService>;
  let mockPartnerRepository: DeepMocked<Repository<PartnerEntity>>;
  let mockAuthService: DeepMocked<AuthService>;
  let mockPartnerAccessService: DeepMocked<PartnerAccessService>;
  let mockSubscriptionUserService: DeepMocked<SubscriptionUserService>;
  let mockTherapySessionService: DeepMocked<TherapySessionService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAuthService = createMock<AuthService>(mockAuthServiceMethods);
    mockPartnerService = createMock<PartnerService>(mockPartnerServiceMethods);
    mockPartnerAccessService = createMock<PartnerAccessService>();
    mockPartnerRepository = createMock<Repository<PartnerEntity>>();
    mockSubscriptionUserService = createMock<SubscriptionUserService>(
      mockSubscriptionUserServiceMethods,
    );
    mockTherapySessionService = createMock<TherapySessionService>(mockTherapySessionServiceMethods);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(UserEntity),
          useFactory: jest.fn(() => mockUserRepositoryMethodsFactory),
        },
        {
          provide: PartnerService,
          useValue: mockPartnerService,
        },
        {
          provide: getRepositoryToken(PartnerEntity),
          useValue: mockPartnerRepository,
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
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repo = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('createUser', () => {
    it('when supplied with user dto and no partner access, it should return a public user', async () => {
      const repoSpyCreate = jest.spyOn(repo, 'create');
      const repoSpySave = jest.spyOn(repo, 'save');

      const user = await service.createUser(createUserDto);
      expect(user.user.email).toBe('user@email.com');
      expect(user.partnerAdmin).toBeUndefined();
      expect(user.partnerAccesses).toBe(undefined);
      expect(repoSpyCreate).toHaveBeenCalledWith(createUserRepositoryDto);
      expect(repoSpySave).toHaveBeenCalled();
      expect(addCrispProfile).toHaveBeenCalledWith({
        email: user.user.email,
        person: { nickname: 'name' },
        segments: ['public'],
      });
    });
    it('when supplied with user dto and partner access, it should return a new partner user', async () => {
      const repoSpyCreate = jest.spyOn(repo, 'create');
      const repoSpySave = jest.spyOn(repo, 'save');
      const partnerAccessSpy = jest
        .spyOn(mockPartnerAccessService, 'assignPartnerAccessOnSignup')
        .mockResolvedValue({
          ...mockPartnerAccessEntity,
          partner: mockPartnerEntity,
        } as PartnerAccessEntity);

      const user = await service.createUser({
        ...createUserDto,
        partnerAccessCode: mockPartnerAccessEntity.accessCode,
      });
      expect(user.user.email).toBe('user@email.com');
      expect(user.partnerAdmin).toBeNull();

      const { therapySession, partnerAdmin, partnerAdminId, userId, ...partnerAccessData } =
        mockPartnerAccessEntity;
      expect(user.partnerAccesses).toEqual([
        { ...partnerAccessData, therapySessions: therapySession },
      ]);

      expect(repoSpyCreate).toHaveBeenCalledWith(createUserRepositoryDto);
      expect(partnerAccessSpy).toHaveBeenCalled();
      expect(repoSpySave).toHaveBeenCalled();

      expect(addCrispProfile).toHaveBeenCalledWith({
        email: user.user.email,
        person: { nickname: 'name' },
        segments: ['bumble'],
      });
    });

    it('when supplied with user dto and partner access that has already been used, it should return an error', async () => {
      const userRepoSpy = jest.spyOn(repo, 'save');
      const assignCodeSpy = jest.spyOn(mockPartnerAccessService, 'assignPartnerAccessOnSignup');
      jest
        .spyOn(mockPartnerAccessService, 'getValidPartnerAccessCode')
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
        .spyOn(mockPartnerAccessService, 'getValidPartnerAccessCode')
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
        .spyOn(mockPartnerAccessService, 'createAndAssignPartnerAccess')
        .mockResolvedValue(mockPartnerAccessEntity);

      jest
        .spyOn(mockPartnerService, 'getPartnerWithPartnerFeaturesById')
        .mockImplementationOnce(
          jest.fn().mockResolvedValue(mockPartnerWithAutomaticAccessCodeFeature),
        );

      const user = await service.createUser({
        ...createUserDto,
        partnerId: mockPartnerEntity.id,
      });

      const { therapySession, partnerAdmin, partnerAdminId, userId, ...partnerAccessData } =
        mockPartnerAccessEntity; // Note different format for the DTO

      expect(user.partnerAccesses).toEqual([
        { ...partnerAccessData, therapySessions: therapySession },
      ]);
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

      const user = await service.getUserByFirebaseId(mockIFirebaseUser);
      expect(user.user.email).toBe('user@email.com');
      expect(user.partnerAdmin).toBeNull();
      expect(user.partnerAccesses).toEqual([]);
    });
  });

  describe('updateUser', () => {
    it('when supplied a firebase user dto, it should return a user', async () => {
      const repoSpySave = jest.spyOn(repo, 'save');

      const user = await service.updateUser(updateUserDto, { user: mockUserEntity });
      expect(user.name).toBe('new name');
      expect(user.email).toBe('user@email.com');
      expect(user.contactPermission).toBe(true);
      expect(user.serviceEmailsPermission).toBe(false);

      expect(repoSpySave).toHaveBeenCalledWith({ ...mockUserEntity, ...updateUserDto });
      expect(repoSpySave).toHaveBeenCalled();
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
      const {
        subscriptionUser,
        therapySession,
        partnerAdmin,
        partnerAccess,
        signUpLanguage,
        contactPermission,
        serviceEmailsPermission,
        courseUser,
        eventLog,
        ...userBase
      } = mockUserEntity;
      jest
        .spyOn(repo, 'find')
        .mockImplementationOnce(async () => [{ ...mockUserEntity, email: 'a@b.com' }]);
      const users = await service.getUsers({ email: 'a@b.com' }, {}, [], 10);
      expect(users).toEqual([{ user: { ...userBase, email: 'a@b.com' }, partnerAccesses: [] }]);
    });
  });
});
