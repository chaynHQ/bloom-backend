import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeatureEntity } from 'src/entities/feature.entity';
import { PartnerFeatureEntity } from 'src/entities/partner-feature.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { UserEntity } from 'src/entities/user.entity';
import { FeatureService } from 'src/feature/feature.service';
import { PartnerService } from 'src/partner/partner.service';
import { UserService } from 'src/user/user.service';
import {
  mockFeatureRepositoryMethods,
  mockPartnerFeatureRepositoryMethods,
  mockPartnerRepositoryMethods,
  mockPartnerServiceMethods,
} from 'test/utils/mockedServices';
import { Repository } from 'typeorm';

const createFeatureDto = {
  name: 'new feature',
};

describe('FeatureService', () => {
  let service: FeatureService;
  let mockPartnerRepository: DeepMocked<Repository<PartnerEntity>>;
  let mockPartnerService: DeepMocked<PartnerService>;
  let mockUserService: DeepMocked<UserService>;
  let mockUserRepository: DeepMocked<Repository<UserEntity>>;
  let mockPartnerFeatureRepository: DeepMocked<Repository<PartnerFeatureEntity>>;
  let mockFeatureRepository: DeepMocked<Repository<FeatureEntity>>;

  beforeEach(async () => {
    mockPartnerRepository = createMock<Repository<PartnerEntity>>(mockPartnerRepositoryMethods);
    mockPartnerService = createMock<PartnerService>(mockPartnerServiceMethods);
    mockUserService = createMock<UserService>();
    mockUserRepository = createMock<Repository<UserEntity>>();
    mockPartnerFeatureRepository = createMock<Repository<PartnerFeatureEntity>>(
      mockPartnerFeatureRepositoryMethods,
    );
    mockFeatureRepository = createMock<Repository<FeatureEntity>>(mockFeatureRepositoryMethods);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureService,
        {
          provide: getRepositoryToken(FeatureEntity),
          useValue: mockFeatureRepository,
        },
        {
          provide: getRepositoryToken(PartnerEntity),
          useValue: mockPartnerRepository,
        },
        {
          provide: PartnerService,
          useValue: mockPartnerService,
        },
        { provide: UserService, useValue: mockUserService },
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepository },

        {
          provide: getRepositoryToken(PartnerFeatureEntity),
          useValue: mockPartnerFeatureRepository,
        },
      ],
    }).compile();

    service = module.get<FeatureService>(FeatureService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('createFeature', () => {
    it('when supplied with correct data should return new feature', async () => {
      const response = await service.createFeature({ name: 'new feature' });
      expect(response).toMatchObject(createFeatureDto);
    });
  });
});
