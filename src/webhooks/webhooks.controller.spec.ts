import { createMock } from '@golevelup/ts-jest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'crypto';
import { frontChatWebhookSecret, storyblokWebhookSecret } from 'src/utils/constants';
import {
  mockSessionEntity,
  mockSimplybookBodyBase,
  mockStoryWebhookDto,
  mockTherapySessionEntity,
} from 'test/utils/mockData';
import { mockWebhooksServiceMethods } from 'test/utils/mockedServices';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

const getWebhookSignature = (body) => {
  return createHmac('sha1', storyblokWebhookSecret)
    .update('' + body)
    .digest('hex');
};

const generateMockHeaders = (body) => {
  return {
    'webhook-signature': getWebhookSignature(body),
  };
};

const createRequestObject = (body) => {
  return {
    rawBody: '' + body,
    setEncoding: () => {},
    encoding: 'utf8',
  };
};

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
      ).resolves.toBe(mockTherapySessionEntity);
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
    describe('handleStoryUpdated', () => {
      it('handleStoryUpdated should pass if service returns true', async () => {
        jest.spyOn(mockWebhooksService, 'handleStoryUpdated').mockImplementationOnce(async () => {
          return mockSessionEntity;
        });
        await expect(
          webhooksController.handleStoryUpdated(
            createRequestObject(mockStoryWebhookDto),
            mockStoryWebhookDto,
            generateMockHeaders(mockStoryWebhookDto),
          ),
        ).resolves.toBe(mockSessionEntity);
      });
    });

    describe('handleFrontChatWebhook', () => {
      const frontChatPayload = {
        id: 'evt_123',
        type: 'inbound',
        emitted_at: 1700000000,
        conversation: {
          id: 'cnv_abc',
          recipient: { handle: 'user@example.com', role: 'to' },
        },
      };

      const createFrontChatSignature = (body) =>
        createHmac('sha1', frontChatWebhookSecret)
          .update('' + body)
          .digest('base64');

      const createFrontChatRequest = (body) => ({
        rawBody: '' + body,
        setEncoding: () => {},
      });

      const createFrontChatHeaders = (body) => ({
        'x-front-signature': createFrontChatSignature(body),
      });

      it('should call service handleFrontChatWebhook with valid signature', async () => {
        const body = JSON.stringify(frontChatPayload);

        await webhooksController.handleFrontChatWebhook(
          createFrontChatRequest(body),
          frontChatPayload,
          createFrontChatHeaders(body),
        );

        expect(mockWebhooksService.handleFrontChatWebhook).toHaveBeenCalledWith(frontChatPayload);
      });

      it('should reject requests with missing signature', async () => {
        await expect(
          webhooksController.handleFrontChatWebhook(
            createFrontChatRequest(JSON.stringify(frontChatPayload)),
            frontChatPayload,
            {},
          ),
        ).rejects.toThrow('Front Chat webhook error - no signature provided');
      });

      it('should reject requests with invalid signature', async () => {
        await expect(
          webhooksController.handleFrontChatWebhook(
            createFrontChatRequest(JSON.stringify(frontChatPayload)),
            frontChatPayload,
            { 'x-front-signature': 'invalid' },
          ),
        ).rejects.toThrow('Front Chat webhook error - signature mismatch');
      });
    });
  });
});
