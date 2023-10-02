import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { addCrispProfile } from 'src/api/crisp/crisp-api';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
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
import { PartnerRepository } from '../partner/partner.repository';
import { PartnerService } from '../partner/partner.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

const createUserDto: CreateUserDto = {
  email: 'user@email.com',
  password: 'password',
  name: 'name',
  contactPermission: false,
  signUpLanguage: 'en',
};
const createUserRepositoryDto = {
  email: 'user@email.com',
  name: 'name',
  contactPermission: false,
  signUpLanguage: 'en',
  firebaseUid: mockUserRecord.uid,
};

const updateUserDto: UpdateUserDto = {
  name: 'new name',
  contactPermission: true,
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

jest.mock('src/api/crisp/crisp-api');

describe('UserService', () => {
  let service: UserService;
  let repo: UserRepository;
  let mockPartnerService: DeepMocked<PartnerService>;
  let mockPartnerRepository: DeepMocked<PartnerRepository>;
  let mockAuthService: DeepMocked<AuthService>;
  let mockPartnerAccessService: DeepMocked<PartnerAccessService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAuthService = createMock<AuthService>(mockAuthServiceMethods);
    mockPartnerService = createMock<PartnerService>(mockPartnerServiceMethods);
    mockPartnerAccessService = createMock<PartnerAccessService>();
    mockPartnerRepository = createMock<PartnerRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useFactory: jest.fn(() => mockUserRepositoryMethodsFactory),
        },
        {
          provide: PartnerService,
          useValue: mockPartnerService,
        },
        {
          provide: PartnerRepository,
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
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repo = module.get<Repository<UserEntity>>(UserRepository);
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
      expect(repoSpyCreate).toBeCalledWith(createUserRepositoryDto);
      expect(repoSpySave).toBeCalled();
      expect(addCrispProfile).toBeCalledWith({
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

      const { therapySession, partnerAdmin, partnerAdminId, ...partnerAccessData } =
        mockPartnerAccessEntity;
      expect(user.partnerAccesses).toEqual([
        { ...partnerAccessData, therapySessions: therapySession },
      ]);

      expect(repoSpyCreate).toBeCalledWith(createUserRepositoryDto);
      expect(partnerAccessSpy).toBeCalled();
      expect(repoSpySave).toBeCalled();

      expect(addCrispProfile).toBeCalledWith({
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
      expect(userRepoSpy).toBeCalledTimes(0);
      expect(assignCodeSpy).toBeCalledTimes(0);
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
      ).rejects.toThrowError('Access code invalid');
      expect(userRepoSpy).toBeCalledTimes(0);
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
      const { therapySession, partnerAdmin, partnerAdminId, ...partnerAccessData } =
        mockPartnerAccessEntity;
      // Note different format for the DTO
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

      expect(repoSpySave).toBeCalledWith({ ...mockUserEntity, ...updateUserDto });
      expect(repoSpySave).toBeCalled();
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

      const user = await service.deleteUserById(mockUserEntity.id);
      expect(user.name).not.toBe(mockUserEntity.name);
      expect(user.email).not.toBe(mockUserEntity.email);

      expect(repoSpySave).toBeCalled();
    });
  });
});
