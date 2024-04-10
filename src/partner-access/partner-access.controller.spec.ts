/* eslint-disable @typescript-eslint/no-unused-vars */
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { UserEntity } from 'src/entities/user.entity';
import { AuthService } from '../auth/auth.service';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { PartnerAdminAuthGuard } from '../partner-admin/partner-admin-auth.guard';
import { UserService } from '../user/user.service';
import { CreatePartnerAccessDto } from './dtos/create-partner-access.dto';
import { PartnerAccessController } from './partner-access.controller';
import { PartnerAccessService } from './partner-access.service';

const mockUserRepository = () => ({});

const mockRequestObject = () => {
  return createMock<Request>();
};

describe('PartnerAccessController', () => {
  let controller: PartnerAccessController;
  let mockPartnerAccessService: Partial<PartnerAccessService>;
  let mockAuthService: DeepMocked<AuthService>;
  let mockUserService: DeepMocked<UserService>;
  const date = Date.now();
  let authGuard: DeepMocked<PartnerAdminAuthGuard>;

  const dto: CreatePartnerAccessDto = {
    featureLiveChat: true,
    featureTherapy: false,
    therapySessionsRedeemed: 5,
    therapySessionsRemaining: 5,
  };

  beforeEach(async () => {
    authGuard = createMock<PartnerAdminAuthGuard>();
    mockAuthService = createMock<AuthService>();
    mockUserService = createMock<UserService>();
    mockPartnerAccessService = {
      createPartnerAccess: (
        createPartnerAccessDto: CreatePartnerAccessDto,
        partnerId: string,
        partnerAdminId: string,
      ) => {
        return Promise.resolve({
          ...createPartnerAccessDto,
          partnerId,
          partnerAdminId,
          accessCode: '000AAA',
          userId: '',
          activatedAt: null,
          createdAt: date,
          updatedAt: date,
          id: '00000000-0000-0000-0000-000000000000',
        } as unknown as PartnerAccessEntity);
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnerAccessController],
      providers: [
        { provide: PartnerAccessService, useValue: mockPartnerAccessService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
        {
          provide: UserEntity,
          useFactory: mockUserRepository,
        },
      ],
    })
      .overrideGuard(PartnerAdminAuthGuard)
      .useValue(authGuard)
      .compile();

    controller = module.get<PartnerAccessController>(PartnerAccessController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('Generate Partner Access', async () => {
    const request: Request = mockRequestObject();
    request['partnerId'] = '00000000-0000-0000-0000-000000000000';
    request['partnerAdminId'] = '00000000-0000-0000-0000-000000000000';
    const dto: CreatePartnerAccessDto = {
      featureLiveChat: true,
      featureTherapy: false,
      therapySessionsRedeemed: 5,
      therapySessionsRemaining: 5,
    };

    const partnerAccess = await controller.generatePartnerAccess(dto, request);

    expect(partnerAccess).toMatchObject({
      ...dto,
      partnerId: '00000000-0000-0000-0000-000000000000',
      partnerAdminId: '00000000-0000-0000-0000-000000000000',
      accessCode: '000AAA',
      userId: '',
      activatedAt: null,
      createdAt: date,
      updatedAt: date,
      id: '00000000-0000-0000-0000-000000000000',
    });
  });
});
