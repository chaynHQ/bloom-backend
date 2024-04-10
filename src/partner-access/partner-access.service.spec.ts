import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { sub } from 'date-fns';
import * as crispApi from 'src/api/crisp/crisp-api';
import { PartnerEntity } from 'src/entities/partner.entity';
import { GetUserDto } from 'src/user/dtos/get-user.dto';
import {
  mockPartnerAccessEntity,
  mockPartnerAccessEntityBase,
  mockPartnerEntity,
  mockUserEntity,
} from 'test/utils/mockData';
import {
  mockPartnerAccessRepositoryMethods,
  mockPartnerRepositoryMethods,
} from 'test/utils/mockedServices';
import { Repository } from 'typeorm';
import { createQueryBuilderMock } from '../../test/utils/mockUtils';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { CreatePartnerAccessDto } from './dtos/create-partner-access.dto';
import { GetPartnerAccessesDto } from './dtos/get-partner-access.dto';
import { UpdatePartnerAccessDto } from './dtos/update-partner-access.dto';
import { PartnerAccessService } from './partner-access.service';

const partnerId = 'partnerId1';
const partnerAdminId = 'partnerAdminId1';

const createPartnerAccessDto: CreatePartnerAccessDto = {
  featureLiveChat: true,
  featureTherapy: true,
  therapySessionsRedeemed: 5,
  therapySessionsRemaining: 5,
};

const mockGetUserDto = {
  user: mockUserEntity,
  partnerAccesses: [],
  partnerAdmin: null,
  courses: [],
  therapySessions: [],
} as GetUserDto;

jest.mock('src/api/crisp/crisp-api', () => ({
  getCrispProfileData: jest.fn(),
  updateCrispProfileData: jest.fn(),
  updateCrispProfileAccesses: jest.fn(),
  updateCrispProfile: jest.fn(),
}));

describe('PartnerAccessService', () => {
  let service: PartnerAccessService;
  let repo: Repository<PartnerAccessEntity>;
  let mockPartnerRepository: DeepMocked<Repository<PartnerEntity>>;
  let mockPartnerAccessRepository: DeepMocked<Repository<PartnerAccessEntity>>;

  beforeEach(async () => {
    mockPartnerRepository = createMock<Repository<PartnerEntity>>(mockPartnerRepositoryMethods);
    mockPartnerAccessRepository = createMock<Repository<PartnerAccessEntity>>(
      mockPartnerAccessRepositoryMethods,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerAccessService,
        {
          provide: PartnerAccessEntity,
          useValue: mockPartnerAccessRepository,
        },
        {
          provide: PartnerEntity,
          useValue: mockPartnerRepository,
        },
      ],
    }).compile();

    service = module.get<PartnerAccessService>(PartnerAccessService);
    repo = module.get<Repository<PartnerAccessEntity>>(PartnerAccessEntity);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('createPartnerAccess', () => {
    it('when supplied with correct data should return access code', async () => {
      const repoSpyCreate = jest.spyOn(repo, 'create');
      const repoSpySave = jest.spyOn(repo, 'save');

      const { accessCode: createdAccessCode, ...generatedCode } = await service.createPartnerAccess(
        createPartnerAccessDto,
        partnerId,
        partnerAdminId,
      );
      const { accessCode, ...partnerEntityWithoutCode } = mockPartnerAccessEntityBase;
      expect(generatedCode).toStrictEqual({
        ...partnerEntityWithoutCode,
        ...createPartnerAccessDto,
        partnerAdminId,
        partnerId,
      });
      expect(createdAccessCode).toHaveLength(6);
      expect(repoSpyCreate).toBeCalledWith(createPartnerAccessDto);
      expect(repoSpySave).toBeCalled();
    });
    it('tries again when it creates a code that already exists', async () => {
      const repoSpyCreateQueryBuilder = jest.spyOn(repo, 'createQueryBuilder');
      // Mocks that the accesscode already exists
      repoSpyCreateQueryBuilder
        .mockImplementation(
          createQueryBuilderMock() as never, // TODO resolve this typescript issue
        )
        .mockImplementationOnce(
          createQueryBuilderMock({
            getOne: jest.fn().mockResolvedValue({ id: 'accessCodeId' }),
          }) as never,
        );

      await service.createPartnerAccess(createPartnerAccessDto, partnerId, partnerAdminId);
      expect(repoSpyCreateQueryBuilder).toBeCalledTimes(2);
      repoSpyCreateQueryBuilder.mockRestore();
    });
  });
  describe('assignPartnerAccess', () => {
    it('should update crisp profile and assign partner access', async () => {
      const repoSpyCreateQueryBuilder = jest.spyOn(repo, 'createQueryBuilder');
      // Mocks that the accesscode already exists
      repoSpyCreateQueryBuilder.mockImplementation(
        createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: '123456' }) }) as never, // TODO resolve this typescript issue
      );

      const partnerAccess = await service.assignPartnerAccess(mockGetUserDto, '123456');

      expect(partnerAccess).toEqual({
        id: '123456',
        userId: mockGetUserDto.user.id,
        activatedAt: partnerAccess.activatedAt, // need to just fudge this as it is test specific
      });

      expect(crispApi.updateCrispProfileAccesses).toBeCalledWith(
        mockGetUserDto.user,
        [partnerAccess],
        [],
      );
    });
    it('should assign partner access even if crisp profile api fails', async () => {
      const repoSpyCreateQueryBuilder = jest.spyOn(repo, 'createQueryBuilder');
      // Mocks that the accesscode already exists
      repoSpyCreateQueryBuilder.mockImplementation(
        createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: '123456' }) }) as never, // TODO resolve this typescript issue
      );
      jest.spyOn(crispApi, 'updateCrispProfileAccesses').mockImplementationOnce(async () => {
        throw new Error('Test throw');
      });

      const partnerAccess = await service.assignPartnerAccess(mockGetUserDto, '123456');

      expect(partnerAccess).toEqual({
        id: '123456',
        userId: mockGetUserDto.user.id,
        activatedAt: partnerAccess.activatedAt, // need to just fudge this as it is test specific
      });
    });
  });
  describe('assignPartnerAccessOnSignUp', () => {
    it('when partnerAccess is supplied, it should create a partner access and assign to user', async () => {
      jest.spyOn(repo, 'createQueryBuilder').mockImplementationOnce(
        createQueryBuilderMock({
          getOne: jest.fn().mockResolvedValue(mockPartnerAccessEntity),
        }) as never,
      );
      const partnerAccess = await service.assignPartnerAccessOnSignup(
        mockPartnerAccessEntity,
        mockGetUserDto.user.id,
      );

      expect(partnerAccess.partnerAdminId).toBeNull();
      expect(partnerAccess.partnerAdmin).toBeNull();

      expect(partnerAccess.userId).toBe(mockGetUserDto.user.id);
      expect(partnerAccess.featureLiveChat).toBeTruthy();
      expect(partnerAccess.featureTherapy).toBeTruthy();
    });
  });
  describe('createAndAssignPartnerAccess', () => {
    it('when partnerId is supplied, it should create a partner access and assign to user', async () => {
      const partnerAccess = await service.createAndAssignPartnerAccess(
        mockPartnerEntity,
        mockGetUserDto.user.id,
      );

      expect(partnerAccess.partnerAdminId).toBeNull();
      expect(partnerAccess.partnerAdmin).toBeNull();

      expect(partnerAccess.userId).toBe(mockGetUserDto.user.id);
      expect(partnerAccess.featureLiveChat).toBeTruthy();
      expect(partnerAccess.featureTherapy).toBeFalsy();
    });
  });
  describe('getPartnerAccessCodes', () => {
    it('when no filter dto is supplied, it should return all partner accesses', async () => {
      const partnerAccesses = await service.getPartnerAccessCodes(undefined);
      expect(partnerAccesses.length).toBeGreaterThan(0);
    });
    it('when a accessCode filter is supplied, it should return all matching accessCodes', async () => {
      jest
        .spyOn(repo, 'find')
        .mockImplementationOnce(async () => [
          { ...mockPartnerAccessEntity, accessCode: mockPartnerAccessEntity.accessCode + 0 },
        ]);
      const partnerAccesses = await service.getPartnerAccessCodes({
        accessCode: mockPartnerAccessEntity.accessCode + 0,
      } as GetPartnerAccessesDto);

      expect(partnerAccesses.length).toBe(1);
    });
  });

  describe('getValidPartnerAccessCode', () => {
    it('when a valid partner access is supplied, it should return partner access', async () => {
      jest.spyOn(repo, 'createQueryBuilder').mockImplementationOnce(
        createQueryBuilderMock({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(mockPartnerAccessEntity),
        }) as never,
      );
      const partnerAccess = await service.getValidPartnerAccessCode('123456');
      expect(partnerAccess).toHaveProperty('accessCode', '123456');
    });

    it('when a valid partner access is supplied, but it was created over a year ago, it should throw error', async () => {
      jest.spyOn(repo, 'createQueryBuilder').mockImplementationOnce(
        createQueryBuilderMock({
          leftJoinAndSelect: jest.fn().mockReturnThis(),

          getOne: jest.fn().mockResolvedValue({
            ...mockPartnerAccessEntity,
            createdAt: sub(new Date(), { years: 1, days: 1 }),
          }),
        }) as never,
      );
      await expect(service.getValidPartnerAccessCode('123456')).rejects.toThrowError(
        'CODE_EXPIRED',
      );
    });
    it('when an partner access with too many letters is supplied, it should throw error', async () => {
      await expect(service.getValidPartnerAccessCode('1234567')).rejects.toThrowError(
        'INVALID_CODE',
      );
    });
  });
  describe('getUserTherapySessions', () => {
    it('should return user emails with their total therapy sessions available and an associated access code id', async () => {
      const repoSpyCreateQueryBuilder = jest.spyOn(repo, 'createQueryBuilder');
      // Mocks the raw results
      const mockResults = [
        {
          useremail: 'test@test.com',
          partneraccesscode: 'ABCDEF',
          therapytotal: '2',
        },
        {
          useremail: 'test2@test2.com',
          partneraccesscode: 'GHIJKL',
          therapytotal: '5',
        },
      ];
      repoSpyCreateQueryBuilder.mockImplementation(
        createQueryBuilderMock({ getRawMany: jest.fn().mockResolvedValue(mockResults) }) as never,
      );
      const userTherapySessions = await service.getUserTherapySessions();
      expect(userTherapySessions.length).toBeGreaterThan(0);
    });
  });

  describe('updatePartnerAccess', () => {
    it('should update the number of therapy sessions remaining on an access code', async () => {
      // Mocks updating an access record
      const partnerAccessRepositorySpy = jest
        .spyOn(mockPartnerAccessRepository, 'save')
        .mockImplementationOnce(
          jest.fn().mockResolvedValue({ ...mockPartnerAccessEntity, therapySessionsRemaining: 10 }),
        ) as never;

      const result = await service.updatePartnerAccess('123456', {
        therapySessionsRemaining: 10,
      } as UpdatePartnerAccessDto);
      //if an access code exists then update it.
      expect(result).toEqual({ ...mockPartnerAccessEntity, therapySessionsRemaining: 10 });
      expect(partnerAccessRepositorySpy).toBeCalledTimes(1);
    });
  });
});
