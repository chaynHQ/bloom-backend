import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { FeatureEntity } from 'src/entities/feature.entity';
import { FeatureService } from 'src/feature/feature.service';
import { PartnerFeatureRepository } from 'src/partner-feature/partner-feature.repository';
import { PartnerRepository } from 'src/partner/partner.repository';
import { PartnerService } from 'src/partner/partner.service';
import { UserRepository } from 'src/user/user.repository';
import { UserService } from 'src/user/user.service';
import {
  mockFeatureRepositoryMethods,
  mockPartnerFeatureRepositoryMethods,
  mockPartnerRepositoryMethods,
  mockPartnerServiceMethods,
} from 'test/utils/mockedServices';
import { Repository } from 'typeorm';
import { FeatureRepository } from './feature.repository';

const createFeatureDto = {
  name: 'new feature',
};

describe('FeatureService', () => {
  let service: FeatureService;
  let repo: FeatureRepository;
  let mockPartnerRepository: DeepMocked<PartnerRepository>;
  let mockPartnerService: DeepMocked<PartnerService>;
  let mockUserService: DeepMocked<UserService>;
  let mockUserRepository: DeepMocked<UserRepository>;
  let mockPartnerFeatureRepository: DeepMocked<PartnerFeatureRepository>;
  let mockFeatureRepository: DeepMocked<FeatureRepository>;

  beforeEach(async () => {
    mockPartnerRepository = createMock<PartnerRepository>(mockPartnerRepositoryMethods);
    mockPartnerService = createMock<PartnerService>(mockPartnerServiceMethods);
    mockUserService = createMock<UserService>();
    mockUserRepository = createMock<UserRepository>();
    mockPartnerFeatureRepository = createMock<PartnerFeatureRepository>(
      mockPartnerFeatureRepositoryMethods,
    );
    mockFeatureRepository = createMock<FeatureRepository>(mockFeatureRepositoryMethods);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureService,
        {
          provide: FeatureRepository,
          useValue: mockFeatureRepository,
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

        { provide: PartnerFeatureRepository, useValue: mockPartnerFeatureRepository },
      ],
    }).compile();

    service = module.get<FeatureService>(FeatureService);
    repo = module.get<Repository<FeatureEntity>>(FeatureRepository);
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
