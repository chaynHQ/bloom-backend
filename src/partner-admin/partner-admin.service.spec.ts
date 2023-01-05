import { Test, TestingModule } from '@nestjs/testing';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { FIREBASE } from 'src/firebase/firebase-factory';
import { PartnerService } from 'src/partner/partner.service';
import { UserRepository } from 'src/user/user.repository';
import { mockPartnerAdminEntity, mockPartnerEntity, mockUserEntity } from 'test/utils/mockData';
import { mockPartnerServiceMethods, mockUserRepositoryMethods } from 'test/utils/mockedServices';
import { Repository } from 'typeorm';
import { createQueryBuilderMock } from '../../test/utils/mockUtils';
import { CreatePartnerAdminUserDto } from './dtos/create-partner-admin-user.dto';
import { CreatePartnerAdminDto } from './dtos/create-partner-admin.dto';
import { PartnerAdminRepository } from './partner-admin.repository';
import { PartnerAdminService } from './partner-admin.service';

const dto: CreatePartnerAdminUserDto = {
  email: mockUserEntity.email,
  name: mockUserEntity.name,
  partnerId: mockPartnerEntity.id,
};

describe('PartnerAdminService', () => {
  let service: PartnerAdminService;
  let repo: PartnerAdminRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerAdminService,
        {
          provide: PartnerAdminRepository,
          useFactory: jest.fn(() => ({
            createQueryBuilder: createQueryBuilderMock(),
            create: (dto: CreatePartnerAdminDto): PartnerAdminEntity | Error => {
              return {
                ...mockPartnerAdminEntity,
                ...dto,
              };
            },
            save: jest.fn((arg) => arg),
          })),
        },
        {
          provide: PartnerService,
          useValue: mockPartnerServiceMethods,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepositoryMethods,
        },
        {
          provide: FIREBASE,
          useFactory: jest.fn(() => ({
            auth: {
              createUserWithEmailAndPassword: jest.fn(async () => {
                return {
                  user: { userId: 'newfirebaseuserid' },
                };
              }),
            },
          })),
        },
      ],
    }).compile();

    service = module.get<PartnerAdminService>(PartnerAdminService);
    repo = module.get<Repository<PartnerAdminEntity>>(PartnerAdminRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('createPartnerAdmin', () => {
    it('when supplied with correct data should create partner admin', async () => {
      const repoSpyCreate = jest.spyOn(repo, 'create');

      const response = await service.createPartnerAdminUser(dto);
      expect(response).toHaveProperty('partnerId', dto.partnerId);
      expect(response).toHaveProperty('user.id', mockUserEntity.id);
      expect(response).toHaveProperty('user.email', dto.email);
      expect(repoSpyCreate).toBeCalled();
    });
  });
});
