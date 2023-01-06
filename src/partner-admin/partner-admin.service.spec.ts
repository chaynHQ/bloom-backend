import { Test, TestingModule } from '@nestjs/testing';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { FIREBASE } from 'src/firebase/firebase-factory';
import { PartnerService } from 'src/partner/partner.service';
import { UserRepository } from 'src/user/user.repository';
import { mockPartnerAdminEntity, mockPartnerEntity, mockUserEntity } from 'test/utils/mockData';
import { mockPartnerServiceMethods } from 'test/utils/mockedServices';
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
          useFactory: jest.fn(() => ({
            save: (arg) => {
              return { ...mockUserEntity, ...arg };
            },
          })),
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
      const repoSpySave = jest.spyOn(repo, 'save');

      const response = await service.createPartnerAdminUser(dto);
      expect(response).toHaveProperty('partnerId', dto.partnerId);
      expect(response).toHaveProperty('userId', mockUserEntity.id);
      expect(repoSpySave).toBeCalled();
    });
  });
});
