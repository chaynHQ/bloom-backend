/* eslint-disable */
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { sub } from 'date-fns';
import * as mailchimpApi from 'src/api/mailchimp/mailchimp-api';
import { CrispService } from 'src/crisp/crisp.service';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { GetUserDto } from 'src/user/dtos/get-user.dto';
import {
  mockPartnerAccessEntity,
  mockPartnerAccessEntityBase,
  mockUserEntity,
} from 'test/utils/mockData';
import {
  mockPartnerAccessRepositoryMethods,
  mockPartnerRepositoryMethods,
  mockClsService,
} from 'test/utils/mockedServices';
import { Repository } from 'typeorm';
import { createQueryBuilderMock } from '../../test/utils/mockUtils';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { PartnerAccessCodeStatusEnum } from '../utils/constants';
import { CreatePartnerAccessDto } from './dtos/create-partner-access.dto';
import { GetPartnerAccessesDto } from './dtos/get-partner-access.dto';
import { UpdatePartnerAccessDto } from './dtos/update-partner-access.dto';
import { PartnerAccessService } from './partner-access.service';
import { Logger } from '../logger/logger';

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
  therapySessions: [],
} as GetUserDto;

jest.mock('src/api/mailchimp/mailchimp-api', () => ({
  createMailchimpMergeField: jest.fn(),
  createMailchimpProfile: jest.fn(),
  updateMailchimpProfile: jest.fn(),
}));
const mockCrispServiceMethods = {};

describe('PartnerAccessService', () => {
  let service: PartnerAccessService;
  let repo: Repository<PartnerAccessEntity>;
  let mockPartnerRepository: DeepMocked<Repository<PartnerEntity>>;
  let mockPartnerAccessRepository: DeepMocked<Repository<PartnerAccessEntity>>;
  let mockServiceUserProfilesService: DeepMocked<ServiceUserProfilesService>;
  let mockCrispService: DeepMocked<CrispService>;
  let mockEventLoggerService: DeepMocked<EventLoggerService>;
  let mockEventLogRepository: DeepMocked<Repository<EventLogEntity>>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPartnerRepository = createMock<Repository<PartnerEntity>>(mockPartnerRepositoryMethods);
    mockPartnerAccessRepository = createMock<Repository<PartnerAccessEntity>>(
      mockPartnerAccessRepositoryMethods,
    );
    mockServiceUserProfilesService = createMock<ServiceUserProfilesService>();
    mockCrispService = createMock<CrispService>(mockCrispServiceMethods);
    mockEventLoggerService = createMock<EventLoggerService>();
    mockEventLogRepository = createMock<Repository<EventLogEntity>>(mockEventLogRepository);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerAccessService,
        {
          provide: getRepositoryToken(PartnerAccessEntity),
          useValue: mockPartnerAccessRepository,
        },
        {
          provide: getRepositoryToken(PartnerEntity),
          useValue: mockPartnerRepository,
        },
        {
          provide: getRepositoryToken(EventLogEntity),
          useValue: mockEventLogRepository,
        },
        { provide: ServiceUserProfilesService, useValue: mockServiceUserProfilesService },
        { provide: CrispService, useValue: mockCrispService },
        { provide: EventLoggerService, useValue: mockEventLoggerService },
      ],
    }).compile();

    service = module.get<PartnerAccessService>(PartnerAccessService);
    const logger = (service as any).logger as Logger;
    (logger as any).cls = mockClsService;
    repo = module.get<Repository<PartnerAccessEntity>>(getRepositoryToken(PartnerAccessEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPartnerAccess', () => {
    it('when supplied with correct data should return access code', async () => {
      const partnerAccessDto = { ...mockPartnerAccessEntityBase, ...createPartnerAccessDto };
      const expectedPartnerAccess = {
        ...partnerAccessDto,
        partnerAdminId,
        partnerId,
        accessCode: '123456',
      };

      const repoFindOneBySpy = jest.spyOn(repo, 'findOneBy');
      repoFindOneBySpy.mockResolvedValueOnce(null);

      const partnerAccessRepositorySpy = jest
        .spyOn(mockPartnerAccessRepository, 'save')
        .mockResolvedValueOnce(expectedPartnerAccess);

      const { ...newPartnerAccess } = await service.createPartnerAccess(
        partnerAccessDto,
        partnerId,
        partnerAdminId,
      );
      expect(newPartnerAccess).toStrictEqual(expectedPartnerAccess);
      expect(newPartnerAccess.accessCode).toHaveLength(6);
      expect(partnerAccessRepositorySpy).toHaveBeenCalled();
      repoFindOneBySpy.mockRestore();
      partnerAccessRepositorySpy.mockRestore();
    });

    it('tries again when it creates a code that already exists', async () => {
      // Mocks that the accesscode already exists
      const repoFindOneBySpy = jest.spyOn(repo, 'findOneBy');
      repoFindOneBySpy.mockResolvedValueOnce(mockPartnerAccessEntity).mockResolvedValue(null);

      const partnerAccessDto = { ...mockPartnerAccessEntityBase, ...createPartnerAccessDto };

      await service.createPartnerAccess(partnerAccessDto, partnerId, partnerAdminId);
      expect(repoFindOneBySpy).toHaveBeenCalledTimes(2);
      repoFindOneBySpy.mockRestore();
    });
  });

  describe('assignPartnerAccess', () => {
    it('should assign partner access and update service profiles', async () => {
      // Mocks save so same
      jest.spyOn(repo, 'save').mockImplementationOnce(async () => {
        return {
          ...mockPartnerAccessEntity,
          id: 'pa1',
          userId: mockUserEntity.id,
        };
      });
      // Mocks that the accesscode already exists
      jest.spyOn(repo, 'findOne').mockResolvedValueOnce(mockPartnerAccessEntity);

      const partnerAccess = await service.assignPartnerAccess(mockUserEntity, '123456');

      expect(partnerAccess).toEqual({
        ...mockPartnerAccessEntity,
        userId: mockUserEntity.id,
        activatedAt: partnerAccess.activatedAt,
      });

      expect(
        mockServiceUserProfilesService.updateServiceUserProfilesPartnerAccess,
      ).toHaveBeenCalledWith([mockPartnerAccessEntity], mockUserEntity.email);
    });

    it('should assign partner access even if crisp profile api fails', async () => {
      // Mocks that the accesscode already exists
      jest.spyOn(repo, 'findOne').mockResolvedValueOnce(mockPartnerAccessEntity);

      jest.spyOn(mockCrispService, 'updateCrispPeopleData').mockImplementationOnce(async () => {
        throw new Error('Test throw');
      });

      const partnerAccess = await service.assignPartnerAccess(mockUserEntity, '123456');

      expect(partnerAccess).toEqual({
        ...mockPartnerAccessEntity,
        userId: mockUserEntity.id,
        activatedAt: partnerAccess.activatedAt,
      });
    });

    it('should assign partner access even if mailchimp profile api fails', async () => {
      // Mocks that the accesscode already exists
      jest.spyOn(repo, 'findOne').mockResolvedValueOnce(mockPartnerAccessEntity);

      jest.spyOn(mailchimpApi, 'updateMailchimpProfile').mockImplementationOnce(async () => {
        throw new Error('Test throw');
      });

      const partnerAccess = await service.assignPartnerAccess(mockUserEntity, '123456');

      expect(partnerAccess).toEqual({
        ...mockPartnerAccessEntity,
        userId: mockUserEntity.id,
        activatedAt: partnerAccess.activatedAt,
      });
    });

    it('should return an error when partner access code has already been used by another user account', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValueOnce({
        ...mockPartnerAccessEntity,
        id: '123456',
        userId: 'anotherUserId',
      });

      await expect(service.assignPartnerAccess(mockUserEntity, '123456')).rejects.toThrow(
        PartnerAccessCodeStatusEnum.ALREADY_IN_USE,
      );
    });

    it('should return an error when partner access code has already been applied to the account', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValueOnce({
        ...mockPartnerAccessEntity,
        id: '123456',
        userId: mockGetUserDto.user.id,
      });

      await expect(service.assignPartnerAccess(mockUserEntity, '123456')).rejects.toThrow(
        PartnerAccessCodeStatusEnum.ALREADY_APPLIED,
      );
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

  describe('getPartnerAccessByCode', () => {
    it('when a valid partner access is supplied, it should return partner access', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValueOnce(mockPartnerAccessEntity);
      const partnerAccess = await service.getPartnerAccessByCode('123456');
      expect(partnerAccess).toHaveProperty('accessCode', '123456');
    });

    it('when a valid partner access is supplied, but it was created over a year ago, it should throw error', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValueOnce({
        ...mockPartnerAccessEntity,
        createdAt: sub(new Date(), { years: 1, days: 1 }),
      });

      await expect(service.getPartnerAccessByCode('123456')).rejects.toThrow('CODE_EXPIRED');
    });

    it('when an partner access with too many letters is supplied, it should throw error', async () => {
      await expect(service.getPartnerAccessByCode('1234567')).rejects.toThrow('INVALID_CODE');
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
      expect(partnerAccessRepositorySpy).toHaveBeenCalled();
    });
  });
});
