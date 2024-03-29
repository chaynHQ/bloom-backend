import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { FeatureService } from 'src/feature/feature.service';
import { PartnerRepository } from 'src/partner/partner.repository';
import { PartnerService } from 'src/partner/partner.service';
import { UserRepository } from 'src/user/user.repository';
import { UserService } from 'src/user/user.service';
import { FEATURES } from 'src/utils/constants';
import { mockFeatureEntity, mockPartnerFeatureEntity } from 'test/utils/mockData';
import {
  mockFeatureServiceMethods,
  mockPartnerFeatureRepositoryMethods,
  mockPartnerRepositoryMethods,
  mockPartnerServiceMethods,
} from 'test/utils/mockedServices';
import { createQueryBuilderMock } from 'test/utils/mockUtils';
import { PartnerFeatureRepository } from './partner-feature.repository';
import { PartnerFeatureService } from './partner-feature.service';

const createPartnerFeatureDto = {
  partnerId: 'partnerId',
  active: true,
  featureId: 'featureId',
};

describe('PartnerFeatureService', () => {
  let service: PartnerFeatureService;
  let mockPartnerRepository: DeepMocked<PartnerRepository>;
  let mockPartnerService: DeepMocked<PartnerService>;
  let mockUserService: DeepMocked<UserService>;
  let mockUserRepository: DeepMocked<UserRepository>;
  let mockFeatureService: DeepMocked<FeatureService>;
  let mockPartnerFeatureRepository: DeepMocked<PartnerFeatureRepository>;

  beforeEach(async () => {
    mockFeatureService = createMock<FeatureService>(mockFeatureServiceMethods);
    mockPartnerRepository = createMock<PartnerRepository>(mockPartnerRepositoryMethods);
    mockPartnerService = createMock<PartnerService>(mockPartnerServiceMethods);
    mockUserService = createMock<UserService>();
    mockUserRepository = createMock<UserRepository>();
    mockPartnerFeatureRepository = createMock<PartnerFeatureRepository>(
      mockPartnerFeatureRepositoryMethods,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerFeatureService,
        {
          provide: PartnerFeatureRepository,
          useValue: mockPartnerFeatureRepository,
        },
        {
          provide: PartnerRepository,
          useValue: mockPartnerRepository,
        },
        {
          provide: PartnerService,
          useValue: mockPartnerService,
        },
        { provide: UserService, useValue: mockUserService },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: UserRepository, useValue: mockUserRepository },

        { provide: FeatureService, useValue: mockFeatureService },
      ],
    }).compile();

    service = module.get<PartnerFeatureService>(PartnerFeatureService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('createPartnerFeature', () => {
    it('when supplied with correct data should return new partner feature', async () => {
      const response = await service.createPartnerFeature(createPartnerFeatureDto);
      expect(response).toMatchObject(createPartnerFeatureDto);
    });
    it('when supplied with incorrect featureId should throw', async () => {
      jest.spyOn(mockFeatureService, 'getFeature').mockImplementationOnce(() => {
        return undefined;
      });
      await expect(service.createPartnerFeature(createPartnerFeatureDto)).rejects.toThrowError();
    });
    it('when supplied with incorrect partnerId should throw', async () => {
      jest.spyOn(mockPartnerService, 'getPartnerById').mockImplementationOnce(() => {
        return undefined;
      });
      await expect(service.createPartnerFeature(createPartnerFeatureDto)).rejects.toThrowError();
    });
  });
  describe('getAutomaticAccessCodeFeatureForPartner', () => {
    it('when supplied with correct data should return automatic access code partner feature', async () => {
      const mockAutomaticAccessCodePartnerFeatureEntity = {
        ...mockPartnerFeatureEntity,
        feature: { ...mockFeatureEntity, name: FEATURES.AUTOMATIC_ACCESS_CODE },
      };
      jest.spyOn(mockPartnerFeatureRepository, 'createQueryBuilder').mockImplementationOnce(
        createQueryBuilderMock({
          getOne: jest.fn().mockResolvedValue(mockAutomaticAccessCodePartnerFeatureEntity),
        }) as never, // TODO resolve this typescript issue
      );
      const response = await service.getAutomaticAccessCodeFeatureForPartner('Badoo');
      expect(response).toMatchObject(mockAutomaticAccessCodePartnerFeatureEntity);
    });
    it('when supplied with incorrect partner name, it should throw', async () => {
      jest.spyOn(mockPartnerService, 'getPartner').mockImplementationOnce(() => undefined);
      await expect(service.getAutomaticAccessCodeFeatureForPartner('Badoo')).rejects.toThrowError(
        'Unable to find partner with that name',
      );
    });
  });
  describe('updatePartnerFeature', () => {
    it('when supplied with correct data should return new partner feature', async () => {
      jest.spyOn(mockPartnerFeatureRepository, 'createQueryBuilder').mockImplementationOnce(
        createQueryBuilderMock({
          execute: jest
            .fn()
            .mockResolvedValue({ raw: [{ ...mockPartnerFeatureEntity, active: false }] }),
        }) as never, // TODO resolve this typescript issue,
      );
      const response = await service.updatePartnerFeature('partnerFeatureId', { active: false });
      expect(response).toMatchObject({ ...mockPartnerFeatureEntity, active: false });
    });
    it('when supplied with incorrect partnerName should throw', async () => {
      jest.spyOn(mockPartnerFeatureRepository, 'createQueryBuilder').mockImplementationOnce(() => {
        throw new Error('Error unable to update');
      });

      await expect(
        service.updatePartnerFeature('partnerFeatureId', { active: false }),
      ).rejects.toThrowError('Error unable to update');
    });
  });
});
