import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { addCrispProfile } from 'src/api/crisp/crisp-api';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { PartnerAccessCodeStatusEnum } from 'src/utils/constants';
import { mockIFirebaseUser, mockUserEntity } from 'test/utils/mockData';
import { mockUserRepositoryMethodsFactory } from 'test/utils/mockedServices';
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
  name: 'name',
  firebaseUid: 'iiiiod',
  contactPermission: false,
};
const updateUserDto: UpdateUserDto = {
  name: 'new name',
  contactPermission: true,
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
    mockAuthService = createMock<AuthService>();
    mockPartnerService = createMock<PartnerService>();
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
      expect(repoSpyCreate).toBeCalledWith(createUserDto);
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
      const now = new Date();
      const partnerAccessSpy = jest
        .spyOn(mockPartnerAccessService, 'assignPartnerAccessOnSignup')
        .mockResolvedValue({
          partner: { id: '123' } as PartnerEntity,
          userId: '123',
          partnerId: '123',
          accessCode: '123456',
          therapySession: [],
          featureLiveChat: true,
          featureTherapy: true,
          therapySessionsRedeemed: 0,
          therapySessionsRemaining: 6,
          id: 'id',
          active: true,
          activatedAt: now,
          updatedAt: now,
          createdAt: now,
        } as PartnerAccessEntity);
      const partnerRepoSpy = jest
        .spyOn(mockPartnerRepository, 'findOne')
        .mockResolvedValue({ id: '123', name: 'Bumble' } as PartnerEntity);

      const user = await service.createUser({ ...createUserDto, partnerAccessCode: '123456' });
      expect(user.user.email).toBe('user@email.com');
      expect(user.partnerAdmin).toBeNull();
      expect(user.partnerAccesses).toEqual([
        {
          accessCode: '123456',
          activatedAt: now,
          active: true,
          createdAt: now,
          featureLiveChat: true,
          featureTherapy: true,
          id: 'id',
          partner: { id: '123' },
          therapySessions: [],
          therapySessionsRedeemed: 0,
          therapySessionsRemaining: 6,
          updatedAt: now,
        },
      ]);

      expect(repoSpyCreate).toBeCalledWith(createUserDto);
      expect(partnerAccessSpy).toBeCalled();
      expect(partnerRepoSpy).toBeCalled();
      expect(repoSpySave).toBeCalled();

      expect(addCrispProfile).toBeCalledWith({
        email: user.user.email,
        person: { nickname: 'name' },
        segments: ['bumble'],
      });
    });

    it('when supplied with user dto and partner access that has already been used, it should return an error', async () => {
      mockPartnerAccessService.assignPartnerAccessOnSignup.mockRejectedValue(
        new HttpException(PartnerAccessCodeStatusEnum.ALREADY_IN_USE, HttpStatus.CONFLICT),
      );
      await expect(async () => {
        await service.createUser({ ...createUserDto, partnerAccessCode: '123456' });
      }).rejects.toThrow(PartnerAccessCodeStatusEnum.ALREADY_IN_USE);
    });
    // TODO - what do we want to happen here?
    it('when supplied with user dto and partner access that has an incorrect partner id, it should return a user without partner access', async () => {
      jest.spyOn(mockPartnerRepository, 'findOne').mockResolvedValue(undefined);
      const user = await service.createUser({ ...createUserDto, partnerAccessCode: '123456' });
      expect(user.partnerAccesses).toBeUndefined();
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

      const user = await service.getUser(mockIFirebaseUser);
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
});
