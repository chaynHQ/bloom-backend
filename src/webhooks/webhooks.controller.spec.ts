import { createMock } from '@golevelup/ts-jest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { mockSimplybookBodyBase } from 'test/utils/mockData';
import { mockWebhooksServiceMethods } from 'test/utils/mockedServices';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

describe('AppController', () => {
  let webhooksController: WebhooksController;
  const mockWebhooksService = createMock<WebhooksService>(mockWebhooksServiceMethods);

  beforeEach(async () => {
    const webhooks: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [{ provide: WebhooksService, useValue: mockWebhooksService }],
    }).compile();

    webhooksController = webhooks.get<WebhooksController>(WebhooksController);
  });

  describe('Webhooks controller', () => {
    it('updatePartnerAccessTherapy should return successful if service returns successful', async () => {
      await expect(
        webhooksController.updatePartnerAccessTherapy(mockSimplybookBodyBase),
      ).resolves.toBe('Successful');
    });
    it('updatePartnerAccessTherapy should error  if service returns errors', async () => {
      jest
        .spyOn(mockWebhooksService, 'updatePartnerAccessTherapy')
        .mockImplementationOnce(async () => {
          throw new HttpException('Therapy session not found', HttpStatus.FORBIDDEN);
        });
      await expect(
        webhooksController.updatePartnerAccessTherapy(mockSimplybookBodyBase),
      ).rejects.toThrow('Therapy session not found');
    });
  });
});
