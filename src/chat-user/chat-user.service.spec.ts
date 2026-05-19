import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatUserEntity } from 'src/entities/chat-user.entity';
import { UserEntity } from 'src/entities/user.entity';
import { ChatUserService } from './chat-user.service';

const mockChatUserRepository = {
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockUserRepository = {
  findOneBy: jest.fn(),
};

const buildChatUser = (overrides: Partial<ChatUserEntity> = {}): ChatUserEntity =>
  ({
    id: 'cu-1',
    userId: 'user-1',
    frontContactId: null,
    frontConversationId: null,
    lastMessageSentAt: null,
    lastMessageReceivedAt: null,
    lastMessageReadAt: null,
    unreadNotificationAttemptedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as ChatUserEntity;

describe('ChatUserService', () => {
  let service: ChatUserService;

  beforeEach(async () => {
    jest.resetAllMocks();

    mockChatUserRepository.findOneBy.mockResolvedValue(null);
    mockChatUserRepository.create.mockImplementation((data) => ({ ...data }));
    mockChatUserRepository.save.mockImplementation(async (data) => ({
      ...buildChatUser(),
      ...data,
    }));
    mockChatUserRepository.update.mockResolvedValue({ affected: 1 });
    mockUserRepository.findOneBy.mockResolvedValue(null);

    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      getMany: jest.fn().mockResolvedValue([]),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    mockChatUserRepository.createQueryBuilder.mockReturnValue(qb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatUserService,
        { provide: getRepositoryToken(ChatUserEntity), useValue: mockChatUserRepository },
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<ChatUserService>(ChatUserService);
  });

  describe('getOrCreateChatUser', () => {
    it('returns existing record without touching the DB a second time', async () => {
      const existing = buildChatUser({ frontContactId: 'crd_1' });
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(existing);

      const result = await service.getOrCreateChatUser('user-1');

      expect(result).toBe(existing);
      expect(mockChatUserRepository.save).not.toHaveBeenCalled();
    });

    it('creates a new record when none exists', async () => {
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(null);
      const saved = buildChatUser();
      mockChatUserRepository.save.mockResolvedValueOnce(saved);

      const result = await service.getOrCreateChatUser('user-1');

      expect(mockChatUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
      );
      expect(result).toBe(saved);
    });

    it('fills in null initial fields on an existing record', async () => {
      const existing = buildChatUser({ frontContactId: null });
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(existing);
      const saved = buildChatUser({ frontContactId: 'crd_new' });
      mockChatUserRepository.save.mockResolvedValueOnce(saved);

      await service.getOrCreateChatUser('user-1', { frontContactId: 'crd_new' });

      expect(mockChatUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ frontContactId: 'crd_new' }),
      );
    });

    it('does not overwrite existing non-null initial fields', async () => {
      const existing = buildChatUser({ frontContactId: 'crd_existing' });
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(existing);

      await service.getOrCreateChatUser('user-1', { frontContactId: 'crd_new' });

      expect(mockChatUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('updateChatUser', () => {
    it('returns null when no ChatUser exists for the userId', async () => {
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(null);
      const result = await service.updateChatUser('user-1', { lastMessageReadAt: new Date() });
      expect(result).toBeNull();
    });

    it('saves updated fields', async () => {
      const existing = buildChatUser();
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(existing);
      const now = new Date();
      const saved = buildChatUser({ lastMessageReadAt: now });
      mockChatUserRepository.save.mockResolvedValueOnce(saved);

      const result = await service.updateChatUser('user-1', { lastMessageReadAt: now });

      expect(mockChatUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ lastMessageReadAt: now }),
      );
      expect(result).toBe(saved);
    });

    it('does not overwrite an existing frontConversationId', async () => {
      const existing = buildChatUser({ frontConversationId: 'cnv_existing' });
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(existing);
      mockChatUserRepository.save.mockImplementation(async (data) => data);

      await service.updateChatUser('user-1', { frontConversationId: 'cnv_new' });

      const saved = mockChatUserRepository.save.mock.calls[0][0];
      expect(saved.frontConversationId).toBe('cnv_existing');
    });
  });

  describe('updateChatUserByEmail', () => {
    it('returns null when no ChatUser and no matching user exists', async () => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockChatUserRepository.createQueryBuilder.mockReturnValue(qb);
      mockUserRepository.findOneBy.mockResolvedValue(null);

      const result = await service.updateChatUserByEmail('user@example.com', {
        lastMessageReceivedAt: new Date(),
      });
      expect(result).toBeNull();
    });

    it('creates a new ChatUser and updates it when user exists but no ChatUser', async () => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockChatUserRepository.createQueryBuilder.mockReturnValue(qb);
      mockUserRepository.findOneBy.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
      const now = new Date();
      const saved = buildChatUser({ lastMessageReceivedAt: now });
      mockChatUserRepository.save.mockResolvedValue(saved);

      const result = await service.updateChatUserByEmail('user@example.com', {
        lastMessageReceivedAt: now,
      });
      expect(result).not.toBeNull();
    });

    it('saves updated fields when ChatUser is found', async () => {
      const existing = buildChatUser();
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existing),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockChatUserRepository.createQueryBuilder.mockReturnValue(qb);
      const now = new Date();
      const saved = buildChatUser({ lastMessageReceivedAt: now });
      mockChatUserRepository.save.mockResolvedValueOnce(saved);

      const result = await service.updateChatUserByEmail('user@example.com', {
        lastMessageReceivedAt: now,
      });

      expect(mockChatUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ lastMessageReceivedAt: now }),
      );
      expect(result).toBe(saved);
    });

    it('saves conversation ID when ChatUser has none', async () => {
      const existing = buildChatUser({ frontConversationId: null });
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existing),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockChatUserRepository.createQueryBuilder.mockReturnValue(qb);
      mockChatUserRepository.save.mockImplementation(async (data) => data);

      await service.updateChatUserByEmail('user@example.com', { frontConversationId: 'cnv_1' });

      const saved = mockChatUserRepository.save.mock.calls[0][0];
      expect(saved.frontConversationId).toBe('cnv_1');
    });

    it('does not overwrite an existing frontConversationId', async () => {
      const existing = buildChatUser({ frontConversationId: 'cnv_existing' });
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existing),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockChatUserRepository.createQueryBuilder.mockReturnValue(qb);
      mockChatUserRepository.save.mockImplementation(async (data) => data);

      await service.updateChatUserByEmail('user@example.com', { frontConversationId: 'cnv_new' });

      const saved = mockChatUserRepository.save.mock.calls[0][0];
      expect(saved.frontConversationId).toBe('cnv_existing');
    });
  });

  describe('markAsRead', () => {
    it('updates lastMessageReadAt to now when there is an unread received message', async () => {
      const existing = buildChatUser({ lastMessageReceivedAt: new Date(Date.now() - 60_000) });
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(existing);
      mockChatUserRepository.save.mockImplementation(async (data) => data);

      const before = Date.now();
      await service.markAsRead('user-1');
      const after = Date.now();

      const saved = mockChatUserRepository.save.mock.calls[0][0];
      expect(saved.lastMessageReadAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(saved.lastMessageReadAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('returns null and does not save when no received message exists', async () => {
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(
        buildChatUser({ lastMessageReceivedAt: null }),
      );

      const result = await service.markAsRead('user-1');

      expect(result).toBeNull();
      expect(mockChatUserRepository.save).not.toHaveBeenCalled();
    });

    it('returns null and does not save when already up to date', async () => {
      const readAt = new Date();
      const receivedAt = new Date(readAt.getTime() - 5000);
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(
        buildChatUser({ lastMessageReceivedAt: receivedAt, lastMessageReadAt: readAt }),
      );

      const result = await service.markAsRead('user-1');

      expect(result).toBeNull();
      expect(mockChatUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('clearConversationId', () => {
    it('nulls out frontConversationId for the given userId', async () => {
      await service.clearConversationId('user-1');
      expect(mockChatUserRepository.update).toHaveBeenCalledWith(
        { userId: 'user-1' },
        { frontConversationId: null },
      );
    });
  });

  describe('setLastMessageSentAt', () => {
    it('saves the chatUser with lastMessageSentAt set', async () => {
      const chatUser = buildChatUser();
      mockChatUserRepository.save.mockImplementation(async (data) => data);
      const sentAt = new Date();

      const result = await service.setLastMessageSentAt(chatUser, sentAt);

      expect(mockChatUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: chatUser.id, lastMessageSentAt: sentAt }),
      );
      expect(result.lastMessageSentAt).toBe(sentAt);
    });
  });
});
