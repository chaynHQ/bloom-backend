import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PartnerEntity } from '../entities/partner.entity';
import { PartnerService } from './partner.service';
import { Repository } from 'typeorm';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { PartnerAdminEntity } from '../entities/partner-admin.entity';
import { UserEntity } from '../entities/user.entity';
import { mockPartnerRepositoryMethods } from '../../test/utils/mockedServices';
import { mockPartnerEntity } from '../../test/utils/mockData';
import { createQueryBuilderMock } from '../../test/utils/mockUtils';

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
    mockPartnerRepository = createMock<Repository<PartnerEntity>>(
      mockPartnerRepositoryMethods,
    );
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
    })
    it('when supplied with a name that already exists, it should throw error', async () => {
      jest
        .spyOn(mockPartnerRepository, 'create')
        .mockImplementationOnce(() => {
          throw ({ code: '23505' });
        });
      await expect(service.createPartner(createPartnerDto)).rejects.toThrow();
    })
  });

  describe('updatePartner', () => {
    it('when supplied with correct data should return new partner', async () => {
      jest.spyOn(mockPartnerRepository, 'createQueryBuilder').mockImplementationOnce(
        createQueryBuilderMock({
          execute: jest
            .fn()
            .mockResolvedValue({raw: [{ ...mockPartnerEntity, active: false }]})
        }) as never, // TODO resolve this typescript issue
      );

      const response = await service.updatePartner(mockPartnerEntity.id, { active: false });
      expect(response).toMatchObject({ ...mockPartnerEntity, active: false });
    })

    it('when supplied with incorrect partnerName should throw', async () => {
      jest.spyOn(mockPartnerRepository, 'createQueryBuilder').mockImplementationOnce(() => {
        throw new Error('Error unable to update');
      })

      await expect(
        service.updatePartner(mockPartnerEntity.id, { active: false })
      ).rejects.toThrow('Error unable to update');
    })
  })
});