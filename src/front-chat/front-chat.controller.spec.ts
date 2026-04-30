import { BadRequestException } from '@nestjs/common';
import { ChatUserEntity } from 'src/entities/chat-user.entity';
import { UserEntity } from 'src/entities/user.entity';
import { FrontChatController } from './front-chat.controller';

describe('FrontChatController', () => {
  let controller: FrontChatController;
  let frontChatService: {
    sendChannelAttachment: jest.Mock;
    markAsRead: jest.Mock;
    getChatUser: jest.Mock;
  };
  let serviceUserProfilesService: {
    ensureFrontContact: jest.Mock;
    updateServiceUserProfilesChatActivity: jest.Mock;
  };

  const buildFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File =>
    ({
      buffer: Buffer.from('binary'),
      mimetype: 'image/png',
      originalname: 'photo.png',
      size: 6,
      ...overrides,
    }) as Express.Multer.File;

  const buildChatUser = (overrides: Partial<ChatUserEntity> = {}): ChatUserEntity =>
    ({ id: 'cu-1', userId: 'u1', ...overrides }) as ChatUserEntity;

  beforeEach(() => {
    frontChatService = {
      sendChannelAttachment: jest.fn().mockResolvedValue(undefined),
      markAsRead: jest.fn().mockResolvedValue(buildChatUser()),
      getChatUser: jest.fn().mockResolvedValue(null),
    };
    serviceUserProfilesService = {
      ensureFrontContact: jest.fn().mockResolvedValue(undefined),
      updateServiceUserProfilesChatActivity: jest.fn().mockResolvedValue(undefined),
    };
    controller = new FrontChatController(
      frontChatService as any,
      serviceUserProfilesService as any,
    );
  });

  it('forwards the file to FrontChatService along with the authed user', async () => {
    const user = { id: 'u1', email: 'u@example.com' } as UserEntity;
    const file = buildFile();

    await controller.uploadAttachment({ userEntity: user } as any, file);

    expect(frontChatService.sendChannelAttachment).toHaveBeenCalledWith(user, file);
  });

  it('throws when no file is provided', async () => {
    await expect(
      controller.uploadAttachment({ userEntity: {} } as any, undefined as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(frontChatService.sendChannelAttachment).not.toHaveBeenCalled();
  });

  describe('markAsRead', () => {
    it('calls frontChatService.markAsRead with the authed user id', async () => {
      const user = { id: 'u1', email: 'u@example.com' } as UserEntity;

      await controller.markAsRead({ userEntity: user } as any);

      expect(frontChatService.markAsRead).toHaveBeenCalledWith('u1');
    });

    it('fires service user profiles sync when chatUser is returned', async () => {
      const user = { id: 'u1', email: 'u@example.com' } as UserEntity;
      const chatUser = buildChatUser({ lastMessageReadAt: new Date() });
      frontChatService.markAsRead.mockResolvedValueOnce(chatUser);

      await controller.markAsRead({ userEntity: user } as any);

      // Allow micro-task queue to flush
      await new Promise((r) => setImmediate(r));

      expect(serviceUserProfilesService.updateServiceUserProfilesChatActivity).toHaveBeenCalledWith(
        chatUser,
        'u@example.com',
      );
    });

    it('does not sync when markAsRead returns null (no chatUser)', async () => {
      frontChatService.markAsRead.mockResolvedValueOnce(null);
      const user = { id: 'u1', email: 'u@example.com' } as UserEntity;

      await controller.markAsRead({ userEntity: user } as any);
      await new Promise((r) => setImmediate(r));

      expect(serviceUserProfilesService.updateServiceUserProfilesChatActivity).not.toHaveBeenCalled();
    });
  });
});
