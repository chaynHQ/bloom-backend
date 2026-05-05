import { createMock } from '@golevelup/ts-jest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'crypto';
import { storyblokWebhookSecret } from 'src/utils/constants';
import {
  mockSessionEntity,
  mockSimplybookBodyBase,
  mockStoryWebhookDto,
  mockTherapySessionEntity,
} from 'test/utils/mockData';
import { mockWebhooksServiceMethods } from 'test/utils/mockedServices';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

// Must match the value inlined in the jest.mock factory below (factories are hoisted,
// so they cannot reference module-scope const declarations).
const TEST_CHANNEL_SIGNING_SECRET = 'test-channel-signing-secret';

jest.mock('src/utils/constants', () => ({
  ...jest.requireActual('src/utils/constants'),
  frontChatWebhookToken: 'test-front-webhook-token',
  frontChannelSigningSecret: 'test-channel-signing-secret',
}));

const getWebhookSignature = (body) => {
  return createHmac('sha1', storyblokWebhookSecret)
    .update('' + body)
    .digest('hex');
};

const buildChannelSignature = (timestamp: string, rawBody: string): string => {
  return createHmac('sha256', TEST_CHANNEL_SIGNING_SECRET)
    .update(`${timestamp}:${rawBody}`)
    .digest('base64');
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

      it('should call service handleFrontChatWebhook with valid bearer token', async () => {
        await webhooksController.handleFrontChatWebhook({}, frontChatPayload, {
          authorization: 'Bearer test-front-webhook-token',
        });

        expect(mockWebhooksService.handleFrontChatWebhook).toHaveBeenCalledWith(frontChatPayload);
      });

      it('should reject requests with missing Authorization header', async () => {
        await expect(
          webhooksController.handleFrontChatWebhook({}, frontChatPayload, {}),
        ).rejects.toThrow('Front Chat webhook error - missing or invalid Authorization header');
      });

      it('should reject requests with invalid token', async () => {
        await expect(
          webhooksController.handleFrontChatWebhook({}, frontChatPayload, {
            authorization: 'Bearer invalid-token',
          }),
        ).rejects.toThrow('Front Chat webhook error - invalid token');
      });
    });

    describe('handleFrontChatWebhook — Channel API path (HMAC auth)', () => {
      // Channel API requests have `type` and `payload` but no `emitted_at` / `target`.
      const channelPayload = {
        type: 'message',
        payload: {
          id: 'msg_001',
          body: 'Hello from agent',
          recipients: [{ handle: 'user@example.com', role: 'to' }],
        },
      };
      const rawBodyStr = JSON.stringify(channelPayload);

      const buildRecentTimestamp = (): string => String(Date.now()); // ms — controller normalises

      const buildRequest = (rawBody: string) => ({
        rawBody: Buffer.from(rawBody),
        protocol: 'https',
        originalUrl: '/webhooks/front-chat',
      });

      it('returns 401 when X-Front-Signature header is missing', async () => {
        const timestamp = buildRecentTimestamp();
        await expect(
          webhooksController.handleFrontChatWebhook(buildRequest(rawBodyStr), channelPayload, {
            'x-front-request-timestamp': timestamp,
          }),
        ).rejects.toMatchObject({ status: HttpStatus.UNAUTHORIZED });
      });

      it('returns 401 when X-Front-Request-Timestamp header is missing', async () => {
        const timestamp = buildRecentTimestamp();
        const signature = buildChannelSignature(timestamp, rawBodyStr);
        await expect(
          webhooksController.handleFrontChatWebhook(buildRequest(rawBodyStr), channelPayload, {
            'x-front-signature': signature,
          }),
        ).rejects.toMatchObject({ status: HttpStatus.UNAUTHORIZED });
      });

      it('returns 401 when the timestamp is older than 5 minutes (replay attack)', async () => {
        const staleTs = String(Date.now() - 6 * 60 * 1000); // 6 min ago in ms
        const signature = buildChannelSignature(staleTs, rawBodyStr);
        await expect(
          webhooksController.handleFrontChatWebhook(buildRequest(rawBodyStr), channelPayload, {
            'x-front-signature': signature,
            'x-front-request-timestamp': staleTs,
          }),
        ).rejects.toMatchObject({ status: HttpStatus.UNAUTHORIZED });
      });

      it('returns 401 when the signature does not match the computed HMAC', async () => {
        const timestamp = buildRecentTimestamp();
        await expect(
          webhooksController.handleFrontChatWebhook(buildRequest(rawBodyStr), channelPayload, {
            'x-front-signature': 'aW52YWxpZHNpZ25hdHVyZQ==', // wrong base64 value
            'x-front-request-timestamp': timestamp,
          }),
        ).rejects.toMatchObject({ status: HttpStatus.UNAUTHORIZED });
      });

      it('returns success when signature, timestamp and body all match', async () => {
        jest.spyOn(mockWebhooksService, 'handleFrontChannelOutbound').mockResolvedValueOnce({
          type: 'success',
          external_id: 'ext_1',
          external_conversation_id: 'conv_1',
        });

        const timestamp = buildRecentTimestamp();
        const signature = buildChannelSignature(timestamp, rawBodyStr);

        const result = await webhooksController.handleFrontChatWebhook(
          buildRequest(rawBodyStr),
          channelPayload,
          {
            'x-front-signature': signature,
            'x-front-request-timestamp': timestamp,
            host: 'bloom-backend.example.com',
          },
        );

        expect(mockWebhooksService.handleFrontChannelOutbound).toHaveBeenCalledWith(channelPayload);
        expect(result).toMatchObject({ type: 'success' });
      });
    });
  });
});
