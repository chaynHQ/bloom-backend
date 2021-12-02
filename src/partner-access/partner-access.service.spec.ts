import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from '../user/user.repository';
import { PartnerAccessRepository } from './partner-access.repository';
import { PartnerAccessService } from './partner-access.service';

const mockTaskRepository = () => ({});

const mockUserRepository = () => ({});

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
        { provide: UserRepository, useFactory: mockUserRepository },
      ],
    }).compile();

    service = module.get<PartnerAccessService>(PartnerAccessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
