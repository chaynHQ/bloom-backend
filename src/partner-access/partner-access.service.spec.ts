import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { createQueryBuilderMock } from '../../test/utils/mocks';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { CreatePartnerAccessDto } from './dtos/create-partner-access.dto';
import { PartnerAccessRepository } from './partner-access.repository';
import { PartnerAccessService } from './partner-access.service';

const partnerId = 'partnerId1';
const partnerAdminId = 'partnerAdminId1';

const createPartnerAccessDto: CreatePartnerAccessDto = {
  featureLiveChat: true,
  featureTherapy: true,
  therapySessionsRedeemed: 5,
  therapySessionsRemaining: 5,
};

const partnerAccessEntityBase = {
  id: 'randomId',
  userId: null,
  partnerId: '',
  partnerAdminId: null,
  user: null,
  partnerAdmin: null,
  partner: null,
  active: false,
  activatedAt: null,
  accessCode: null,
  createdAt: new Date(),
  therapySession: [],
  updatedAt: null,
};

describe('PartnerAccessService', () => {
  let service: PartnerAccessService;
  let repo: PartnerAccessRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerAccessService,
        {
          provide: PartnerAccessRepository,
          useFactory: jest.fn(() => ({
            createQueryBuilder: createQueryBuilderMock(),
            create: (dto: CreatePartnerAccessDto): PartnerAccessEntity | Error => {
              return {
                ...partnerAccessEntityBase,
                ...dto,
              };
            },
            save: jest.fn((arg) => arg),
          })),
        },
      ],
    }).compile();

    service = module.get<PartnerAccessService>(PartnerAccessService);
    repo = module.get<Repository<PartnerAccessEntity>>(PartnerAccessRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('createPartnerAccess', () => {
    it('when supplied with correct data should return access code', async () => {
      const repoSpyCreate = jest.spyOn(repo, 'create');
      const repoSpySave = jest.spyOn(repo, 'save');

      const { accessCode: createdAccessCode, ...generatedCode } = await service.createPartnerAccess(
        createPartnerAccessDto,
        partnerId,
        partnerAdminId,
      );
      const { accessCode, ...partnerEntityWithoutCode } = partnerAccessEntityBase;
      expect(generatedCode).toStrictEqual({
        ...partnerEntityWithoutCode,
        ...createPartnerAccessDto,
        partnerAdminId,
        partnerId,
      });
      expect(createdAccessCode).toHaveLength(6);
      expect(repoSpyCreate).toBeCalledWith(createPartnerAccessDto);
      expect(repoSpySave).toBeCalled();
    });
    it('tries again when it creates a code that already exists', async () => {
      const repoSpyCreateQueryBuilder = jest.spyOn(repo, 'createQueryBuilder');
      // Mocks that the accesscode already exists
      repoSpyCreateQueryBuilder
        .mockImplementation(
          createQueryBuilderMock() as never, // TODO resolve this typescript issue
        )
        .mockImplementationOnce(
          createQueryBuilderMock({
            getOne: jest.fn().mockResolvedValue({ id: 'accessCodeId' }),
          }) as never,
        );

      await service.createPartnerAccess(createPartnerAccessDto, partnerId, partnerAdminId);
      expect(repoSpyCreateQueryBuilder).toBeCalledTimes(2);
      repoSpyCreateQueryBuilder.mockRestore();
    });
  });
});
