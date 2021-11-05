import { Test, TestingModule } from '@nestjs/testing';
import { PartnerAccessController } from './partner-access.controller';

describe('PartnerAccessController', () => {
  let controller: PartnerAccessController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnerAccessController],
    }).compile();

    controller = module.get<PartnerAccessController>(PartnerAccessController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
