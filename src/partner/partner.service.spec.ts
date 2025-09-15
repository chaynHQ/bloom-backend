import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createQueryBuilderMock } from 'test/utils/mockUtils';
import { Repository } from 'typeorm';
import { mockPartnerEntity } from '../../test/utils/mockData';
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

  beforeEach(async () => {
    mockPartnerRepository = createMock<Repository<PartnerEntity>>(mockPartnerRepositoryMethods);
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
    it('when supplied with a name that already exists, it should throw error', async () => {
      jest.spyOn(mockPartnerRepository, 'create').mockImplementationOnce(() => {
        throw { code: '23505' };
      });
      await expect(service.createPartner(createPartnerDto)).rejects.toThrow();
    });
  });

  describe('updatePartner', () => {
    it('when supplied with isActive data should update partner', async () => {
      jest.spyOn(mockPartnerRepository, 'save').mockImplementationOnce(() => {
        return Promise.resolve({ ...mockPartnerEntity, isActive: false });
      });

      jest.spyOn(mockPartnerAccessRepository, 'createQueryBuilder').mockImplementationOnce(
        createQueryBuilderMock({
          execute: jest.fn().mockResolvedValue({}),
        }) as never,
      );

      jest.spyOn(mockPartnerAdminRepository, 'createQueryBuilder').mockImplementationOnce(
        createQueryBuilderMock({
          execute: jest.fn().mockResolvedValue({}),
        }) as never,
      );

      const response = await service.updatePartnerActiveStatus(mockPartnerEntity.id, {
        active: false,
      });

      expect(mockPartnerRepository.save).toHaveBeenCalledWith({
        ...mockPartnerEntity,
        isActive: false,
      });
      expect(mockPartnerAdminRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockPartnerAccessRepository.createQueryBuilder).toHaveBeenCalled();
      expect(response).toMatchObject({ ...mockPartnerEntity, isActive: false });
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
