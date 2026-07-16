import { EVENT_NAME } from 'src/event-logger/event-logger.interface';
import { FrontChatWebhookService } from './front-chat-webhook.service';

const flush = () => new Promise((r) => setImmediate(r));

describe('FrontChatWebhookService.handleFrontChannelOutbound', () => {
  const chatUserService = {
    getChatUserByEmail: jest.fn(),
    updateChatUserByEmail: jest.fn().mockResolvedValue(null),
  };
  const frontChatGateway = { emitAgentReply: jest.fn() };
  const serviceUserProfilesService = { updateServiceUserProfilesChatActivity: jest.fn() };
  const eventLoggerService = { createEventLog: jest.fn().mockResolvedValue(undefined) };

  const service = new FrontChatWebhookService(
    {} as never,
    chatUserService as never,
    frontChatGateway as never,
    serviceUserProfilesService as never,
    eventLoggerService as never,
  );

  const outbound = {
    type: 'message',
    payload: { id: 'msg_1', text: 'Hi from support', recipients: [{ role: 'to', handle: 'user@example.com' }] },
  };

  beforeEach(() => jest.clearAllMocks());

  it('logs CHAT_MESSAGE_RECEIVED against the resolved userId', async () => {
    chatUserService.getChatUserByEmail.mockResolvedValue({ userId: 'user-1' });

    await service.handleFrontChannelOutbound(outbound);
    await flush();

    expect(eventLoggerService.createEventLog).toHaveBeenCalledWith(
      { userId: 'user-1', event: EVENT_NAME.CHAT_MESSAGE_RECEIVED, date: expect.any(Date) },
      undefined,
    );
  });

  it('falls back to the recipient email when no chatUser is found', async () => {
    chatUserService.getChatUserByEmail.mockResolvedValue(null);

    await service.handleFrontChannelOutbound(outbound);
    await flush();

    expect(eventLoggerService.createEventLog).toHaveBeenCalledWith(
      { userId: undefined, event: EVENT_NAME.CHAT_MESSAGE_RECEIVED, date: expect.any(Date) },
      'user@example.com',
    );
  });

  it('still returns success when event logging fails', async () => {
    chatUserService.getChatUserByEmail.mockResolvedValue({ userId: 'user-1' });
    eventLoggerService.createEventLog.mockRejectedValueOnce(new Error('db down'));

    const result = await service.handleFrontChannelOutbound(outbound);
    await flush();

    expect(result.type).toBe('success');
  });
});
