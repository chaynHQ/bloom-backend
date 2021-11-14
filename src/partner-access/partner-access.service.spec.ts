import { Test, TestingModule } from '@nestjs/testing';
import { PartnerAccessRepository } from './partner-access.repository';
import { PartnerAccessService } from './partner-access.service';

const mockTaskRepository = () => ({});

describe('PartnerAccessService', () => {
  let service: Partial<PartnerAccessService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerAccessService,
        {
          provide: PartnerAccessRepository,
          useFactory: mockTaskRepository,
        },
      ],
    }).compile();

    service = module.get<PartnerAccessService>(PartnerAccessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
