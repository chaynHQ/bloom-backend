/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { CreatePartnerAccessDto } from './dto/create-partner-access.dto';
import { PartnerAccessController } from './partner-access.controller';
import { PartnerAccessService } from './partner-access.service';

describe('PartnerAccessController', () => {
  let controller: PartnerAccessController;
  let mockPartnerAccessService: Partial<PartnerAccessService>;
  const date = Date.now();

  const dto: CreatePartnerAccessDto = {
    featureLiveChat: true,
    featureTherapy: false,
    therapySessionsRedeemed: 5,
    therapySessionsRemaining: 5,
  };

  beforeEach(async () => {
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
      providers: [{ provide: PartnerAccessService, useValue: mockPartnerAccessService }],
    }).compile();

    controller = module.get<PartnerAccessController>(PartnerAccessController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('Generate Partner Access', async () => {
    const partnerId = '00000000-0000-0000-0000-000000000000';
    const partnerAdminId = '00000000-0000-0000-0000-000000000000';
    const dto: CreatePartnerAccessDto = {
      featureLiveChat: true,
      featureTherapy: false,
      therapySessionsRedeemed: 5,
      therapySessionsRemaining: 5,
    };

    const partnerAccess = await controller.generatePartnerAccess(dto, partnerId, partnerAdminId);

    expect(partnerAccess).toMatchObject({
      ...dto,
      partnerId,
      partnerAdminId,
      accessCode: '000AAA',
      userId: '',
      activatedAt: null,
      createdAt: date,
      updatedAt: date,
      id: '00000000-0000-0000-0000-000000000000',
    });
  });
});
