import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { UserEntity } from 'src/entities/user.entity';
import { FIREBASE } from 'src/firebase/firebase-factory';
import { PartnerService } from 'src/partner/partner.service';
import { mockPartnerAdminEntity, mockPartnerEntity, mockUserEntity } from 'test/utils/mockData';
import { mockPartnerServiceMethods } from 'test/utils/mockedServices';
import { Repository } from 'typeorm';
import { createQueryBuilderMock } from '../../test/utils/mockUtils';
import { CreatePartnerAdminUserDto } from './dtos/create-partner-admin-user.dto';
import { CreatePartnerAdminDto } from './dtos/create-partner-admin.dto';
import { PartnerAdminService } from './partner-admin.service';

const dto: CreatePartnerAdminUserDto = {
  email: mockUserEntity.email,
  name: mockUserEntity.name,
  partnerId: mockPartnerEntity.id,
};

describe('PartnerAdminService', () => {
  let service: PartnerAdminService;
  let repo: Repository<PartnerAdminEntity>;
  let mockUserRepository: DeepMocked<Repository<UserEntity>>;

  beforeEach(async () => {
    mockUserRepository = createMock<Repository<UserEntity>>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerAdminService,
        {
          provide: PartnerAdminEntity,
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
          provide: UserEntity,
          useValue: mockUserRepository,
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
    repo = module.get<Repository<PartnerAdminEntity>>(PartnerAdminEntity);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('createPartnerAdmin', () => {
    it('when supplied with correct data should create partner admin', async () => {
      const repoSpySave = jest.spyOn(repo, 'save');
      jest.spyOn(mockUserRepository, 'save').mockResolvedValue(mockUserEntity);

      const response = await service.createPartnerAdminUser(dto);
      expect(response).toHaveProperty('partnerId', dto.partnerId);
      expect(response).toHaveProperty('userId', mockUserEntity.id);
      expect(repoSpySave).toBeCalled();
    });
  });
  it('when supplied with an email that already exists, it should throw', async () => {
    jest
      .spyOn(mockUserRepository, 'save')
      .mockRejectedValueOnce(new Error('auth/email-already-in-use'));
    await expect(service.createPartnerAdminUser(dto)).rejects.toThrow('auth/email-already-in-use');
  });
});
