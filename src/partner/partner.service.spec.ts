import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeatureEntity } from 'src/entities/feature.entity';
import { PartnerFeatureEntity } from 'src/entities/partner-feature.entity';
import { FEATURES } from 'src/utils/constants';
import {
  createMockFeatureManager,
  createQueryBuilderMock,
  partnerLookupQueryBuilderMock,
} from 'test/utils/mockUtils';
import { EntityManager, In, Repository } from 'typeorm';
import {
  mockAllPartnerEntities,
  mockAltPartnerEntity,
  mockBumbleForFriendsPartnerEntity,
  mockFruitzPartnerEntity,
  mockPartnerEntity,
} from '../../test/utils/mockData';
import { mockPartnerRepositoryMethods } from '../../test/utils/mockedServices';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { PartnerAdminEntity } from '../entities/partner-admin.entity';
import { PartnerEntity } from '../entities/partner.entity';
import { UserEntity } from '../entities/user.entity';
import { PartnerService } from './partner.service';

const createPartnerDto = {
  name: mockPartnerEntity.name,
};

describe('PartnerService', () => {
  let service: PartnerService;
  let mockPartnerRepository: DeepMocked<Repository<PartnerEntity>>;
  let mockPartnerAccessRepository: DeepMocked<Repository<PartnerAccessEntity>>;
  let mockPartnerAdminRepository: DeepMocked<Repository<PartnerAdminEntity>>;
  let mockUserRepository: DeepMocked<Repository<UserEntity>>;
  let mockManager: ReturnType<typeof createMockFeatureManager>;

  beforeEach(async () => {
    mockManager = createMockFeatureManager();
    mockPartnerRepository = createMock<Repository<PartnerEntity>>({
      ...mockPartnerRepositoryMethods,
      manager: mockManager as unknown as EntityManager,
    });
    mockPartnerAccessRepository = createMock<Repository<PartnerAccessEntity>>();
    mockPartnerAdminRepository = createMock<Repository<PartnerAdminEntity>>();
    mockUserRepository = createMock<Repository<UserEntity>>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerService,
        { provide: getRepositoryToken(PartnerEntity), useValue: mockPartnerRepository },
        { provide: getRepositoryToken(PartnerAccessEntity), useValue: mockPartnerAccessRepository },
        { provide: getRepositoryToken(PartnerAdminEntity), useValue: mockPartnerAdminRepository },
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<PartnerService>(PartnerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPartner', () => {
    it('when supplied with correct data should return new partner', async () => {
      const response = await service.createPartner(createPartnerDto);
      expect(response).toMatchObject(createPartnerDto);
    });
    it('sets the slug from the name', async () => {
      const response = await service.createPartner({ name: 'Bumble For Friends' });
      expect(mockPartnerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Bumble For Friends', slug: 'bumble-for-friends' }),
      );
      expect(response).toMatchObject({ name: 'Bumble For Friends', slug: 'bumble-for-friends' });
    });
    it('rejects a name with no letters or digits to make a slug from', async () => {
      await expect(service.createPartner({ name: '!!!' })).rejects.toThrow();
      expect(mockPartnerRepository.save).not.toHaveBeenCalled();
    });
    it('when supplied with a name that already exists, it should throw error', async () => {
      jest.spyOn(mockPartnerRepository, 'create').mockImplementationOnce(() => {
        throw { code: '23505' };
      });
      await expect(service.createPartner(createPartnerDto)).rejects.toThrow();
    });
  });

  describe.each([
    ['getPartner', (s: PartnerService, value: string) => s.getPartner(value)],
    [
      'getPartnerWithPartnerFeaturesByName',
      (s: PartnerService, value: string) => s.getPartnerWithPartnerFeaturesByName(value),
    ],
  ])('%s', (_name, lookup) => {
    beforeEach(() => {
      mockPartnerRepository.createQueryBuilder.mockImplementation(
        partnerLookupQueryBuilderMock(mockAllPartnerEntities) as never,
      );
    });

    it.each(['bumble', 'Bumble', 'BUMBLE'])(
      '%s finds Bumble, not Bumble For Friends',
      async (value) => {
        expect((await lookup(service, value))?.id).toBe(mockPartnerEntity.id);
      },
    );

    it.each(['bumble-for-friends', 'Bumble For Friends', 'BUMBLE FOR FRIENDS'])(
      '%s finds Bumble For Friends',
      async (value) => {
        expect((await lookup(service, value))?.id).toBe(mockBumbleForFriendsPartnerEntity.id);
      },
    );

    it('badoo and fruitz find their partners', async () => {
      expect((await lookup(service, 'badoo'))?.id).toBe(mockAltPartnerEntity.id);
      expect((await lookup(service, 'Fruitz'))?.id).toBe(mockFruitzPartnerEntity.id);
    });

    it.each(['umble', 'B_mble', 'Bum%', '%', 'Bumble For', 'friends'])(
      '%s finds nothing',
      async (value) => {
        expect(await lookup(service, value)).toBeNull();
      },
    );
  });

  describe('getActivePartners', () => {
    it('returns only the id, name and slug of active partners', async () => {
      mockPartnerRepository.find.mockResolvedValueOnce([
        mockPartnerEntity,
        mockFruitzPartnerEntity,
      ] as never);

      const response = await service.getActivePartners();

      expect(mockPartnerRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
      expect(response).toEqual([
        { id: mockPartnerEntity.id, name: 'Bumble', slug: 'bumble' },
        { id: mockFruitzPartnerEntity.id, name: 'Fruitz', slug: 'fruitz' },
      ]);
    });
  });

  describe('getPartners', () => {
    const automaticAccessCodeFeature = { id: 'featureId', name: FEATURES.AUTOMATIC_ACCESS_CODE };

    it('adds automaticAccessCode from the active AUTOMATIC_ACCESS_CODE partner feature', async () => {
      mockPartnerRepository.find.mockResolvedValueOnce([
        {
          ...mockBumbleForFriendsPartnerEntity,
          storyblokUuid: 'storyUuid',
          partnerFeature: [{ active: true, feature: automaticAccessCodeFeature }],
        },
        {
          ...mockAltPartnerEntity,
          partnerFeature: [{ active: false, feature: automaticAccessCodeFeature }],
        },
        { ...mockFruitzPartnerEntity, partnerFeature: [] },
      ] as never);

      const response = await service.getPartners();

      expect(response).toEqual([
        expect.objectContaining({
          id: mockBumbleForFriendsPartnerEntity.id,
          name: 'Bumble For Friends',
          slug: 'bumble-for-friends',
          storyblokUuid: 'storyUuid',
          therapySessionsPerCode: 0,
          automaticAccessCode: true,
        }),
        expect.objectContaining({ slug: 'badoo', automaticAccessCode: false }),
        expect.objectContaining({ slug: 'fruitz', automaticAccessCode: false }),
      ]);
      expect(response[0]).not.toHaveProperty('partnerFeature');
    });
  });

  describe('updatePartner', () => {
    const mockCascadeQueryBuilders = () => {
      const adminQueryBuilder = createQueryBuilderMock({
        execute: jest.fn().mockResolvedValue({}),
      });
      const accessQueryBuilder = createQueryBuilderMock({
        execute: jest.fn().mockResolvedValue({}),
      });
      mockPartnerAdminRepository.createQueryBuilder.mockImplementation(adminQueryBuilder as never);
      mockPartnerAccessRepository.createQueryBuilder.mockImplementation(
        accessQueryBuilder as never,
      );
      return {
        adminSet: () => adminQueryBuilder.mock.results.map((r) => r.value.set.mock.calls[0][0]),
        accessSet: () => accessQueryBuilder.mock.results.map((r) => r.value.set.mock.calls[0][0]),
      };
    };

    const expectNoCascade = () => {
      expect(mockPartnerAdminRepository.findBy).not.toHaveBeenCalled();
      expect(mockPartnerAccessRepository.findBy).not.toHaveBeenCalled();
      expect(mockPartnerAdminRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(mockPartnerAccessRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(mockPartnerAccessRepository.save).not.toHaveBeenCalled();
      expect(mockPartnerAdminRepository.save).not.toHaveBeenCalled();
    };

    it('{ therapySessionsPerCode } changes only the limit; admins and accesses untouched', async () => {
      const response = await service.updatePartnerActiveStatus(mockPartnerEntity.id, {
        therapySessionsPerCode: 3,
      });

      expect(mockPartnerRepository.save).toHaveBeenCalledWith({
        ...mockPartnerEntity,
        therapySessionsPerCode: 3,
      });
      expect(response).toMatchObject({ isActive: true, therapySessionsPerCode: 3 });
      expectNoCascade();
      expect(mockManager.save).not.toHaveBeenCalled();
    });

    it('{ active: true } on an active partner leaves a deactivated access deactivated', async () => {
      const response = await service.updatePartnerActiveStatus(mockPartnerEntity.id, {
        active: true,
      });

      expect(response).toMatchObject({ isActive: true });
      expectNoCascade();
    });

    it('{ active: false } on an inactive partner does nothing to admins or accesses', async () => {
      mockPartnerRepository.findOneBy.mockResolvedValueOnce({
        ...mockPartnerEntity,
        isActive: false,
      });

      await service.updatePartnerActiveStatus(mockPartnerEntity.id, { active: false });

      expectNoCascade();
    });

    it('{ active: false } deactivates the partner, its admins and every access; { active: true } then reactivates them', async () => {
      const cascade = mockCascadeQueryBuilders();
      mockPartnerAdminRepository.findBy.mockResolvedValue([{ id: 'admin1' }] as never);
      mockPartnerAccessRepository.findBy.mockResolvedValue([
        { id: 'access1' },
        { id: 'access2' },
      ] as never);

      const deactivated = await service.updatePartnerActiveStatus(mockPartnerEntity.id, {
        active: false,
      });

      expect(mockPartnerRepository.save).toHaveBeenLastCalledWith({
        ...mockPartnerEntity,
        isActive: false,
      });
      expect(deactivated).toMatchObject({ isActive: false });
      expect(mockPartnerAdminRepository.findBy).toHaveBeenCalledWith({
        partnerId: mockPartnerEntity.id,
      });
      expect(mockPartnerAccessRepository.findBy).toHaveBeenCalledWith({
        partnerId: mockPartnerEntity.id,
      });
      expect(cascade.adminSet()).toEqual([{ active: false }]);
      expect(cascade.accessSet()).toEqual([{ active: false }]);
      const accessWhere = (
        mockPartnerAccessRepository.createQueryBuilder.mock.results[0].value as {
          where: jest.Mock;
        }
      ).where;
      expect(accessWhere).toHaveBeenCalledWith({ id: In(['access1', 'access2']) });

      mockPartnerRepository.findOneBy.mockResolvedValueOnce({
        ...mockPartnerEntity,
        isActive: false,
      });
      const reactivated = await service.updatePartnerActiveStatus(mockPartnerEntity.id, {
        active: true,
      });

      expect(reactivated).toMatchObject({ isActive: true });
      expect(cascade.adminSet()).toEqual([{ active: false }, { active: true }]);
      expect(cascade.accessSet()).toEqual([{ active: false }, { active: true }]);
    });

    it('{ automaticAccessCode: true } creates the row; false sets it inactive; true again reuses it', async () => {
      await service.updatePartnerActiveStatus(mockBumbleForFriendsPartnerEntity.id, {
        automaticAccessCode: true,
      });

      const features = mockManager.tables.get(FeatureEntity);
      const partnerFeatures = mockManager.tables.get(PartnerFeatureEntity);
      expect(features).toEqual([expect.objectContaining({ name: FEATURES.AUTOMATIC_ACCESS_CODE })]);
      expect(partnerFeatures).toEqual([
        expect.objectContaining({
          partnerId: mockBumbleForFriendsPartnerEntity.id,
          featureId: features[0].id,
          active: true,
        }),
      ]);

      await service.updatePartnerActiveStatus(mockBumbleForFriendsPartnerEntity.id, {
        automaticAccessCode: false,
      });
      expect(partnerFeatures).toEqual([expect.objectContaining({ active: false })]);

      await service.updatePartnerActiveStatus(mockBumbleForFriendsPartnerEntity.id, {
        automaticAccessCode: true,
      });
      expect(features).toHaveLength(1);
      expect(partnerFeatures).toEqual([expect.objectContaining({ active: true })]);
      expectNoCascade();
    });

    it('{ automaticAccessCode: true } uses the existing feature', async () => {
      mockManager.tables
        .get(FeatureEntity)
        .push({ id: 'existingFeatureId', name: FEATURES.AUTOMATIC_ACCESS_CODE });

      await service.updatePartnerActiveStatus(mockBumbleForFriendsPartnerEntity.id, {
        automaticAccessCode: true,
      });

      expect(mockManager.tables.get(FeatureEntity)).toHaveLength(1);
      expect(mockManager.tables.get(PartnerFeatureEntity)).toEqual([
        expect.objectContaining({ featureId: 'existingFeatureId', active: true }),
      ]);
    });

    it('{ automaticAccessCode: false } with no row creates nothing', async () => {
      await service.updatePartnerActiveStatus(mockBumbleForFriendsPartnerEntity.id, {
        automaticAccessCode: false,
      });

      expect(mockManager.tables.get(PartnerFeatureEntity)).toEqual([]);
    });

    it('applies active, therapySessionsPerCode and automaticAccessCode sent together', async () => {
      const cascade = mockCascadeQueryBuilders();
      mockPartnerAdminRepository.findBy.mockResolvedValue([{ id: 'admin1' }] as never);
      mockPartnerAccessRepository.findBy.mockResolvedValue([{ id: 'access1' }] as never);

      const response = await service.updatePartnerActiveStatus(mockPartnerEntity.id, {
        active: false,
        therapySessionsPerCode: 3,
        automaticAccessCode: true,
      });

      expect(mockPartnerRepository.save).toHaveBeenCalledWith({
        ...mockPartnerEntity,
        isActive: false,
        therapySessionsPerCode: 3,
      });
      expect(response).toMatchObject({ isActive: false, therapySessionsPerCode: 3 });
      expect(mockManager.tables.get(PartnerFeatureEntity)).toEqual([
        expect.objectContaining({ partnerId: mockPartnerEntity.id, active: true }),
      ]);
      expect(cascade.adminSet()).toEqual([{ active: false }]);
      expect(cascade.accessSet()).toEqual([{ active: false }]);
    });

    it('does not save automaticAccessCode onto the partner', async () => {
      await service.updatePartnerActiveStatus(mockPartnerEntity.id, {
        automaticAccessCode: true,
      });

      expect(mockPartnerRepository.save).toHaveBeenCalledWith(mockPartnerEntity);
    });

    it('when supplied with incorrect partner id should throw', async () => {
      jest.spyOn(mockPartnerRepository, 'findOneBy').mockImplementationOnce(() => {
        return Promise.resolve(null);
      });

      await expect(
        service.updatePartnerActiveStatus('invalidid', { active: false }),
      ).rejects.toThrow('Partner does not exist');
    });
  });
});
