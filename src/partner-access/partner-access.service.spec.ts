import { Test, TestingModule } from '@nestjs/testing';
import { PartnerAccessService } from './partner-access.service';

describe('PartnerAccessService', () => {
  let service: PartnerAccessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PartnerAccessService],
    }).compile();

    service = module.get<PartnerAccessService>(PartnerAccessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
