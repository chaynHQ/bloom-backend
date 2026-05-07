import { createMock } from '@golevelup/ts-jest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FrontChatWebhookService } from 'src/front-chat/front-chat-webhook.service';
import { mockSessionEntity, mockSimplybookBodyBase, mockStoryWebhookDto, mockTherapySessionEntity } from 'test/utils/mockData';
import { mockWebhooksServiceMethods } from 'test/utils/mockedServices';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

describe('AppController', () => {
  let webhooksController: WebhooksController;
  const mockWebhooksService = createMock<WebhooksService>(mockWebhooksServiceMethods);
  const mockFrontChatWebhookService = createMock<FrontChatWebhookService>();

  beforeEach(async () => {
    const webhooks: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: WebhooksService, useValue: mockWebhooksService },
        { provide: FrontChatWebhookService, useValue: mockFrontChatWebhookService },
      ],
    }).compile();

    webhooksController = webhooks.get<WebhooksController>(WebhooksController);
  });

  describe('Webhooks controller', () => {
    it('updatePartnerAccessTherapy should return successful if service returns successful', async () => {
      await expect(
        webhooksController.updatePartnerAccessTherapy(mockSimplybookBodyBase),
      ).resolves.toBe(mockTherapySessionEntity);
    });

    it('updatePartnerAccessTherapy should error if service returns errors', async () => {
      jest
        .spyOn(mockWebhooksService, 'updatePartnerAccessTherapy')
        .mockImplementationOnce(async () => {
          throw new HttpException('Therapy session not found', HttpStatus.FORBIDDEN);
        });
      await expect(
        webhooksController.updatePartnerAccessTherapy(mockSimplybookBodyBase),
      ).rejects.toThrow('Therapy session not found');
    });

    describe('handleStoryUpdated', () => {
      it('delegates to webhooksService.handleStoryblokWebhook with rawBody and signature', async () => {
        jest
          .spyOn(mockWebhooksService, 'handleStoryblokWebhook')
          .mockResolvedValueOnce(mockSessionEntity as any);
        const req = { rawBody: Buffer.from(JSON.stringify(mockStoryWebhookDto)) };
        const signature = 'test-sig';

        await expect(
          webhooksController.handleStoryUpdated(req, mockStoryWebhookDto, signature),
        ).resolves.toBe(mockSessionEntity);

        expect(mockWebhooksService.handleStoryblokWebhook).toHaveBeenCalledWith(
          req.rawBody,
          signature,
          mockStoryWebhookDto,
        );
      });
    });

    describe('handleFrontChatWebhook', () => {
      it('delegates to frontChatWebhookService.handleFrontWebhook with request data', async () => {
        mockFrontChatWebhookService.handleFrontWebhook.mockResolvedValueOnce(undefined);
        const req = {
          rawBody: Buffer.from('{}'),
          protocol: 'https',
          originalUrl: '/webhooks/front-chat',
        };
        const data = { type: 'inbound', emitted_at: 1700000000 };
        const headers = { authorization: 'Bearer token', host: 'example.com' };

        await webhooksController.handleFrontChatWebhook(req, data, headers);

        expect(mockFrontChatWebhookService.handleFrontWebhook).toHaveBeenCalledWith({
          rawBody: req.rawBody,
          data,
          headers,
          protocol: 'https',
          host: 'example.com',
          originalUrl: '/webhooks/front-chat',
        });
      });
    });
  });
});
