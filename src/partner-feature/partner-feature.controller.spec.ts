import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from 'src/entities/user.entity';
import { SuperAdminAuthGuard } from 'src/partner-admin/super-admin-auth.guard';
import { mockPartnerFeatureEntity } from 'test/utils/mockData';
import { mockPartnerFeatureServiceMethods } from 'test/utils/mockedServices';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { PartnerAdminAuthGuard } from '../partner-admin/partner-admin-auth.guard';
import { UserService } from '../user/user.service';
import { CreatePartnerFeatureDto } from './dtos/create-partner-feature.dto';
import { PartnerFeatureController } from './partner-feature.controller';
import { PartnerFeatureService } from './partner-feature.service';

describe('PartnerFeatureController', () => {
  let controller: PartnerFeatureController;
  let mockPartnerFeatureService: Partial<PartnerFeatureService>;
  let mockAuthService: DeepMocked<AuthService>;
  let mockUserService: DeepMocked<UserService>;
  let mockUserRepository: DeepMocked<Repository<UserEntity>>;

  let authGuard: DeepMocked<PartnerAdminAuthGuard>;

  beforeEach(async () => {
    authGuard = createMock<PartnerAdminAuthGuard>();
    mockAuthService = createMock<AuthService>();
    mockUserService = createMock<UserService>();
    mockUserRepository = createMock<Repository<UserEntity>>();
    mockPartnerFeatureService = createMock<PartnerFeatureService>(mockPartnerFeatureServiceMethods);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnerFeatureController],
      providers: [
        { provide: PartnerFeatureService, useValue: mockPartnerFeatureService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepository },
      ],
    })
      .overrideGuard(SuperAdminAuthGuard)
      .useValue(authGuard)
      .compile();

    controller = module.get<PartnerFeatureController>(PartnerFeatureController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('createPartnerFeature', async () => {
    const createPartnerFeature: CreatePartnerFeatureDto = {
      featureId: 'featureId',
      partnerId: 'partnerId',
      active: true,
    };
    const partnerFeature = await controller.createPartnerFeature(createPartnerFeature);
    expect(partnerFeature).toMatchObject({
      id: mockPartnerFeatureEntity.id,
      ...createPartnerFeature,
    });
  });
});
