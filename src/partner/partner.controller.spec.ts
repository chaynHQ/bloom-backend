import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { FEATURES } from 'src/utils/constants';
import { mockBumbleForFriendsPartnerEntity } from 'test/utils/mockData';
import { SuperAdminAuthGuard } from '../partner-admin/super-admin-auth.guard';
import { PartnerController } from './partner.controller';
import { PartnerService } from './partner.service';

describe('PartnerController', () => {
  let controller: PartnerController;
  let mockPartnerService: DeepMocked<PartnerService>;

  beforeEach(async () => {
    mockPartnerService = createMock<PartnerService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnerController],
      providers: [{ provide: PartnerService, useValue: mockPartnerService }],
    })
      .overrideGuard(SuperAdminAuthGuard)
      .useValue(createMock<SuperAdminAuthGuard>())
      .compile();

    controller = module.get<PartnerController>(PartnerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Nest registers routes in declaration order, so GET :name declared first would read
  // /partner/active as a partner called "active"
  it('declares GET active before GET :name', () => {
    const prototype = PartnerController.prototype;
    const getPaths = Object.getOwnPropertyNames(prototype)
      .filter(
        (method) =>
          method !== 'constructor' &&
          Reflect.getMetadata(METHOD_METADATA, prototype[method]) === RequestMethod.GET,
      )
      .map((method) => Reflect.getMetadata(PATH_METADATA, prototype[method]));

    expect(getPaths).toContain('active');
    expect(getPaths.indexOf('active')).toBeLessThan(getPaths.indexOf(':name'));
  });

  it('GET active returns the active partners from the service', async () => {
    const activePartners = [{ id: 'partnerId', name: 'Bumble', slug: 'bumble' }];
    mockPartnerService.getActivePartners.mockResolvedValueOnce(activePartners);

    expect(await controller.getActivePartners()).toEqual(activePartners);
  });

  it('GET :name looks up by the value sent and returns slug and therapySessionsPerCode', async () => {
    mockPartnerService.getPartnerWithPartnerFeaturesByName.mockResolvedValueOnce({
      ...mockBumbleForFriendsPartnerEntity,
      partnerFeature: [
        {
          id: 'pf1',
          featureId: 'f1',
          active: true,
          feature: { id: 'f1', name: FEATURES.AUTOMATIC_ACCESS_CODE },
        },
      ],
    } as never);

    const response = await controller.getPartner({ name: 'bumble-for-friends' });

    expect(mockPartnerService.getPartnerWithPartnerFeaturesByName).toHaveBeenCalledWith(
      'bumble-for-friends',
    );
    expect(response).toMatchObject({
      id: mockBumbleForFriendsPartnerEntity.id,
      name: 'Bumble For Friends',
      slug: 'bumble-for-friends',
      isActive: false,
      therapySessionsPerCode: 0,
      partnerFeature: [
        {
          featureId: 'f1',
          feature: { id: 'f1', name: FEATURES.AUTOMATIC_ACCESS_CODE },
          active: true,
        },
      ],
    });
  });

  it('PATCH :id passes the update to the service', async () => {
    const update = { active: false, therapySessionsPerCode: 3, automaticAccessCode: true };

    await controller.updatePartnerActiveStatus(
      { id: mockBumbleForFriendsPartnerEntity.id },
      update,
    );

    expect(mockPartnerService.updatePartnerActiveStatus).toHaveBeenCalledWith(
      mockBumbleForFriendsPartnerEntity.id,
      update,
    );
  });
});
