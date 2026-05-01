import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChatUserEntity } from 'src/entities/chat-user.entity';
import { UserEntity } from 'src/entities/user.entity';
import { FrontChatController } from './front-chat.controller';
import { ChatHistoryMessage } from './front-chat.service';

describe('FrontChatController', () => {
  let controller: FrontChatController;
  let frontChatService: {
    sendChannelAttachment: jest.Mock;
    markAsRead: jest.Mock;
    getChatUser: jest.Mock;
    getConversationHistory: jest.Mock;
    fetchAttachment: jest.Mock;
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
      getConversationHistory: jest.fn().mockResolvedValue([]),
      fetchAttachment: jest
        .fn()
        .mockResolvedValue({ buffer: Buffer.from('img'), contentType: 'image/png' }),
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

      expect(
        serviceUserProfilesService.updateServiceUserProfilesChatActivity,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getMessages', () => {
    it('returns message history wrapped in { messages } for authenticated user', async () => {
      const user = { id: 'u1', email: 'u@example.com' } as UserEntity;
      const history: ChatHistoryMessage[] = [
        { id: 'msg-1', direction: 'agent', text: 'Hello!', createdAt: 1000 },
        { id: 'msg-2', direction: 'user', text: 'Hi there', createdAt: 2000 },
      ];
      frontChatService.getConversationHistory.mockResolvedValueOnce(history);

      const result = await controller.getMessages({ userEntity: user } as any);

      expect(frontChatService.getConversationHistory).toHaveBeenCalledWith(user);
      expect(result).toEqual({ messages: history });
    });

    it('propagates exceptions thrown by the service', async () => {
      const user = { id: 'u1', email: 'u@example.com' } as UserEntity;
      frontChatService.getConversationHistory.mockRejectedValueOnce(new Error('Front API down'));

      await expect(controller.getMessages({ userEntity: user } as any)).rejects.toThrow(
        'Front API down',
      );
    });
  });

  describe('proxyAttachment', () => {
    const buildRes = () => {
      const res = {
        set: jest.fn(),
        send: jest.fn(),
      };
      return res;
    };

    it('proxies the attachment when given a valid frontapp.com HTTPS URL', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      frontChatService.fetchAttachment.mockResolvedValueOnce({
        buffer: imageBuffer,
        contentType: 'image/jpeg',
      });
      const res = buildRes();

      await controller.proxyAttachment(
        'https://api2.frontapp.com/attachments/file.jpg',
        res as any,
      );

      expect(frontChatService.fetchAttachment).toHaveBeenCalledWith(
        'https://api2.frontapp.com/attachments/file.jpg',
      );
      expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, max-age=3600');
      expect(res.set).toHaveBeenCalledWith('Content-Disposition', 'inline');
      expect(res.send).toHaveBeenCalledWith(imageBuffer);
    });

    it('throws BadRequestException for an HTTP (non-HTTPS) frontapp URL', async () => {
      const res = buildRes();

      await expect(
        controller.proxyAttachment('http://api2.frontapp.com/attachments/file.jpg', res as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(frontChatService.fetchAttachment).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for an HTTPS URL on a non-frontapp domain', async () => {
      const res = buildRes();

      await expect(
        controller.proxyAttachment('https://evil.example.com/steal', res as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(frontChatService.fetchAttachment).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the URL query param is missing', async () => {
      const res = buildRes();

      await expect(controller.proxyAttachment(undefined as any, res as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(frontChatService.fetchAttachment).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the service cannot fetch the attachment', async () => {
      frontChatService.fetchAttachment.mockRejectedValueOnce(new Error('Attachment not found'));
      const res = buildRes();

      await expect(
        controller.proxyAttachment('https://api2.frontapp.com/attachments/missing.jpg', res as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getMessages', () => {
    it('returns message history wrapped in { messages } for authenticated user', async () => {
      const user = { id: 'u1', email: 'u@example.com' } as UserEntity;
      const history: ChatHistoryMessage[] = [
        { id: 'msg-1', direction: 'agent', text: 'Hello!', createdAt: 1000 },
        { id: 'msg-2', direction: 'user', text: 'Hi there', createdAt: 2000 },
      ];
      frontChatService.getConversationHistory.mockResolvedValueOnce(history);

      const result = await controller.getMessages({ userEntity: user } as any);

      expect(frontChatService.getConversationHistory).toHaveBeenCalledWith(user);
      expect(result).toEqual({ messages: history });
    });

    it('propagates exceptions thrown by the service', async () => {
      const user = { id: 'u1', email: 'u@example.com' } as UserEntity;
      frontChatService.getConversationHistory.mockRejectedValueOnce(new Error('Front API down'));

      await expect(controller.getMessages({ userEntity: user } as any)).rejects.toThrow(
        'Front API down',
      );
    });
  });

  describe('proxyAttachment', () => {
    const buildRes = () => {
      const res = {
        set: jest.fn(),
        send: jest.fn(),
      };
      return res;
    };

    it('proxies the attachment when given a valid frontapp.com HTTPS URL', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      frontChatService.fetchAttachment.mockResolvedValueOnce({
        buffer: imageBuffer,
        contentType: 'image/jpeg',
      });
      const res = buildRes();

      await controller.proxyAttachment(
        'https://api2.frontapp.com/attachments/file.jpg',
        res as any,
      );

      expect(frontChatService.fetchAttachment).toHaveBeenCalledWith(
        'https://api2.frontapp.com/attachments/file.jpg',
      );
      expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, max-age=3600');
      expect(res.set).toHaveBeenCalledWith('Content-Disposition', 'inline');
      expect(res.send).toHaveBeenCalledWith(imageBuffer);
    });

    it('throws BadRequestException for an HTTP (non-HTTPS) frontapp URL', async () => {
      const res = buildRes();

      await expect(
        controller.proxyAttachment('http://api2.frontapp.com/attachments/file.jpg', res as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(frontChatService.fetchAttachment).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for an HTTPS URL on a non-frontapp domain', async () => {
      const res = buildRes();

      await expect(
        controller.proxyAttachment('https://evil.example.com/steal', res as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(frontChatService.fetchAttachment).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the URL query param is missing', async () => {
      const res = buildRes();

      await expect(controller.proxyAttachment(undefined as any, res as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(frontChatService.fetchAttachment).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the service cannot fetch the attachment', async () => {
      frontChatService.fetchAttachment.mockRejectedValueOnce(new Error('Attachment not found'));
      const res = buildRes();

      await expect(
        controller.proxyAttachment('https://api2.frontapp.com/attachments/missing.jpg', res as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
