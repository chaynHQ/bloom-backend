import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatUserEntity } from 'src/entities/chat-user.entity';
import { UserEntity } from 'src/entities/user.entity';
import { FrontChatService } from './front-chat.service';

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('src/utils/constants', () => ({
  ...jest.requireActual('src/utils/constants'),
  frontChatApiToken: 'test-api-token',
  frontChannelId: 'cha_test',
  frontContactListId: 'grp_test',
}));

const mockChatUserRepository = {
  findOneBy: jest.fn(),
  findOne: jest.fn(),
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
    lastUnreadNotifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as ChatUserEntity;

describe('FrontChatService', () => {
  let service: FrontChatService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default: no existing chatUser
    mockChatUserRepository.findOneBy.mockResolvedValue(null);
    mockChatUserRepository.create.mockImplementation((data) => ({ ...data }));
    mockChatUserRepository.save.mockImplementation(async (data) => ({ ...buildChatUser(), ...data }));
    mockChatUserRepository.update.mockResolvedValue({ affected: 1 });
    mockUserRepository.findOneBy.mockResolvedValue(null);

    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      getMany: jest.fn().mockResolvedValue([]),
    };
    mockChatUserRepository.createQueryBuilder.mockReturnValue(qb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FrontChatService,
        {
          provide: getRepositoryToken(ChatUserEntity),
          useValue: mockChatUserRepository,
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<FrontChatService>(FrontChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── ChatUser operations ──────────────────────────────────────────────────────

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
    it('updates lastMessageReadAt to now', async () => {
      const existing = buildChatUser();
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(existing);
      mockChatUserRepository.save.mockImplementation(async (data) => data);

      const before = Date.now();
      await service.markAsRead('user-1');
      const after = Date.now();

      const saved = mockChatUserRepository.save.mock.calls[0][0];
      expect(saved.lastMessageReadAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(saved.lastMessageReadAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  // ── createContact ────────────────────────────────────────────────────────────

  describe('createContact', () => {
    it('should create a new Front Chat contact and add it to the contact list using the canonical ID', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: 'cnt_123', name: 'Test User' }),
        })
        .mockResolvedValueOnce({ ok: true, status: 204 });

      const result = await service.createContact({
        email: 'user@example.com',
        name: 'Test User',
      });

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://api2.frontapp.com/contacts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-api-token' }),
        }),
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://api2.frontapp.com/contact_lists/grp_test/contacts',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ contact_ids: ['cnt_123'] }),
        }),
      );
      expect(result).toEqual({ id: 'cnt_123', name: 'Test User' });
    });

    it('saves frontContactId to ChatUser when userId is provided', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: 'crd_abc' }),
        })
        .mockResolvedValueOnce({ ok: true, status: 204 });
      const saved = buildChatUser({ frontContactId: 'crd_abc' });
      mockChatUserRepository.save.mockResolvedValueOnce(saved);

      await service.createContact({ email: 'user@example.com', userId: 'user-1' });

      expect(mockChatUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', frontContactId: 'crd_abc' }),
      );
    });

    it('still returns the created contact when adding to the group fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: 'cnt_123' }),
        })
        .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'oops' });

      await expect(
        service.createContact({ email: 'user@example.com' }),
      ).resolves.toEqual({ id: 'cnt_123' });
    });

    it('should skip creation for Cypress test emails', async () => {
      const result = await service.createContact({ email: 'cypresstestemail+123@chayn.co' });
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should throw a wrapped error when the API call fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => 'Unprocessable Entity',
      });

      await expect(service.createContact({ email: 'user@example.com' })).rejects.toThrow(
        'Create Front Chat contact API call failed',
      );
    });
  });

  // ── updateContactCustomFields ────────────────────────────────────────────────

  describe('updateContactCustomFields', () => {
    it('should update custom fields, look up the canonical ID, then add to the contact list', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) }) // PATCH
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'crd_u1' }) }) // GET canonical ID
        .mockResolvedValueOnce({ ok: true, status: 204 }); // POST list

      await service.updateContactCustomFields({ language: 'en' }, 'user@example.com');

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://api2.frontapp.com/contacts/alt:email:user%40example.com',
        expect.objectContaining({ method: 'PATCH' }),
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://api2.frontapp.com/contacts/alt:email:user%40example.com',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        'https://api2.frontapp.com/contact_lists/grp_test/contacts',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ contact_ids: ['crd_u1'] }),
        }),
      );
    });

    it('should create contact and retry if contact not found (404)', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404, text: async () => '404 not found' }) // PATCH fails
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'cnt_new' }) }) // createContact POST
        .mockResolvedValueOnce({ ok: true, status: 204 }) // createContact list add (canonical ID from create)
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) }); // retry PATCH

      await service.updateContactCustomFields({ language: 'en' }, 'user@example.com');

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should skip for Cypress test emails', async () => {
      await service.updateContactCustomFields({ language: 'en' }, 'cypresstestemail+1@chayn.co');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ── updateContactProfile ─────────────────────────────────────────────────────

  describe('updateContactProfile', () => {
    it('should update name on an existing contact, look up canonical ID, then add to list', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) }) // PATCH
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'crd_u1' }) }) // GET canonical ID
        .mockResolvedValueOnce({ ok: true, status: 204 }); // POST list

      await service.updateContactProfile({ name: 'New Name' }, 'user@example.com');

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://api2.frontapp.com/contacts/alt:email:user%40example.com',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    it('should create contact and retry if contact not found (404)', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404, text: async () => '404 not found' })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'cnt_new' }) })
        .mockResolvedValueOnce({ ok: true, status: 204 })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });

      await service.updateContactProfile({ name: 'New Name' }, 'user@example.com');

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should skip for Cypress test emails', async () => {
      await service.updateContactProfile({ name: 'Test' }, 'cypresstestemail+1@chayn.co');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ── deleteContact ─────────────────────────────────────────────────────────────

  describe('deleteContact', () => {
    it('should delete a Front Chat contact', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 204 });

      await service.deleteContact('user@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api2.frontapp.com/contacts/alt:email:user%40example.com',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('should throw a wrapped error when deletion fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not found',
      });

      await expect(service.deleteContact('user@example.com')).rejects.toThrow(
        'Delete Front Chat contact API call failed',
      );
    });
  });

  // ── getConversationHistory ───────────────────────────────────────────────────

  describe('getConversationHistory', () => {
    const user = { id: 'user-1', email: 'user@example.com', name: 'Alex' };

    it('returns empty array when no ChatUser record exists', async () => {
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(null);
      const result = await service.getConversationHistory(user);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('returns empty array when ChatUser exists but frontConversationId is null', async () => {
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(buildChatUser({ frontConversationId: null }));
      const result = await service.getConversationHistory(user);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('fetches messages using the stored frontConversationId', async () => {
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(
        buildChatUser({ frontConversationId: 'cnv_abc' }),
      );
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ _results: [], _pagination: {} }),
      });

      await service.getConversationHistory(user);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api2.frontapp.com/conversations/cnv_abc/messages?limit=100');
    });

    it('returns empty array for Cypress test emails', async () => {
      const result = await service.getConversationHistory({
        ...user,
        email: 'cypresstestemail+1@chayn.co',
      });
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('maps inbound messages as user and outbound as agent, sorted chronologically', async () => {
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(
        buildChatUser({ frontConversationId: 'cnv_abc' }),
      );
      const now = Math.floor(Date.now() / 1000);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          _results: [
            { id: 'msg_2', is_inbound: false, text: 'Hi there', created_at: now, author: { first_name: 'Agent', last_name: 'One' } },
            { id: 'msg_1', is_inbound: true, text: 'Hello', created_at: now - 10 },
          ],
          _pagination: {},
        }),
      });

      const messages = await service.getConversationHistory(user);

      expect(messages).toHaveLength(2);
      expect(messages[0]).toMatchObject({ id: 'msg_1', direction: 'user', text: 'Hello' });
      expect(messages[1]).toMatchObject({ id: 'msg_2', direction: 'agent', text: 'Hi there', authorName: 'Agent One' });
    });

    it('paginates through all messages when _pagination.next is set', async () => {
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(
        buildChatUser({ frontConversationId: 'cnv_abc' }),
      );
      const now = Math.floor(Date.now() / 1000);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            _results: [{ id: 'msg_1', is_inbound: true, text: 'First', created_at: now - 20 }],
            _pagination: { next: 'https://api2.frontapp.com/conversations/cnv_abc/messages?limit=100&after=cursor1' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            _results: [{ id: 'msg_2', is_inbound: false, text: 'Second', created_at: now }],
            _pagination: {},
          }),
        });

      const messages = await service.getConversationHistory(user);

      expect(messages).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('returns partial results when a 404 is encountered mid-pagination', async () => {
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(
        buildChatUser({ frontConversationId: 'cnv_abc' }),
      );
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'not found' });

      const result = await service.getConversationHistory(user);
      expect(result).toEqual([]);
    });

    it('maps image attachment messages with kind=image and an attachmentUrl proxy path', async () => {
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(
        buildChatUser({ frontConversationId: 'cnv_abc' }),
      );
      const now = Math.floor(Date.now() / 1000);
      const attachmentUrl = 'https://api2.frontapp.com/download/att_1/photo.jpg';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          _results: [
            {
              id: 'msg_1',
              is_inbound: true,
              body: 'Attachment',
              text: 'Attachment',
              created_at: now,
              attachments: [{ url: attachmentUrl, filename: 'photo.jpg', content_type: 'image/jpeg' }],
            },
          ],
          _pagination: {},
        }),
      });

      const messages = await service.getConversationHistory(user);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        id: 'msg_1',
        kind: 'image',
        text: 'photo.jpg',
        attachmentUrl: `/front-chat/attachment-proxy?url=${encodeURIComponent(attachmentUrl)}`,
      });
    });

    it('skips messages with no text and no image attachment', async () => {
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(
        buildChatUser({ frontConversationId: 'cnv_abc' }),
      );
      const now = Math.floor(Date.now() / 1000);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          _results: [
            { id: 'msg_1', is_inbound: true, body: '', text: '', created_at: now },
          ],
          _pagination: {},
        }),
      });

      const messages = await service.getConversationHistory(user);
      expect(messages).toHaveLength(0);
    });
  });

  // ── fetchAttachment ──────────────────────────────────────────────────────────

  describe('fetchAttachment', () => {
    it('returns buffer directly when Front responds with 200 (no redirect)', async () => {
      const url = 'https://chayneb55.api.frontapp.com/messages/msg_abc/download/fil_xyz';
      jest.spyOn(service as any, 'frontAttachmentRequest').mockResolvedValueOnce({
        statusCode: 200,
        buffer: Buffer.from([1, 2, 3]),
        contentType: 'image/jpeg',
      });

      const result = await service.fetchAttachment(url);

      expect(result.contentType).toBe('image/jpeg');
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('fetches CDN Location URL without auth when Front returns a redirect', async () => {
      const url = 'https://chayneb55.api.frontapp.com/messages/msg_abc/download/fil_xyz';
      const cdnUrl = 'https://s3.amazonaws.com/bucket/file?X-Amz-Signature=abc';

      jest.spyOn(service as any, 'frontAttachmentRequest').mockResolvedValueOnce({
        statusCode: 302,
        location: cdnUrl,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'audio/webm' },
        arrayBuffer: async () => new ArrayBuffer(0),
      });

      const result = await service.fetchAttachment(url);

      expect(mockFetch.mock.calls[0][0]).toBe(cdnUrl);
      expect(result.contentType).toBe('audio/webm');
    });

    it('throws when Front returns non-ok and non-redirect', async () => {
      const url = 'https://chayneb55.api.frontapp.com/messages/msg_abc/download/fil_xyz';
      jest.spyOn(service as any, 'frontAttachmentRequest').mockResolvedValueOnce({
        statusCode: 403,
      });

      await expect(service.fetchAttachment(url)).rejects.toThrow('Front attachment fetch failed (403)');
    });

    it('throws when CDN returns non-ok status', async () => {
      const url = 'https://chayneb55.api.frontapp.com/messages/msg_abc/download/fil_xyz';
      jest.spyOn(service as any, 'frontAttachmentRequest').mockResolvedValueOnce({
        statusCode: 302,
        location: 'https://s3.amazonaws.com/bucket/file?X-Amz-Signature=abc',
      });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

      await expect(service.fetchAttachment(url)).rejects.toThrow('CDN fetch failed (403)');
    });

    it('throws for non-frontapp URLs', async () => {
      await expect(service.fetchAttachment('https://evil.com/image.jpg')).rejects.toThrow(
        'Invalid attachment URL',
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('getConversationHistory — audio attachments', () => {
    const user = { id: 'user-1', email: 'user@example.com', name: 'Alex' };

    it('maps audio attachment messages with kind=voice and an attachmentUrl proxy path', async () => {
      mockChatUserRepository.findOneBy.mockResolvedValueOnce(
        buildChatUser({ frontConversationId: 'cnv_abc' }),
      );
      const now = Math.floor(Date.now() / 1000);
      const audioUrl = 'https://chayneb55.api.frontapp.com/messages/msg_1/download/fil_audio';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          _results: [
            {
              id: 'msg_1',
              is_inbound: true,
              body: 'Voice note',
              text: 'Voice note',
              created_at: now,
              attachments: [{ url: audioUrl, filename: 'voice-note.webm', content_type: 'audio/webm' }],
            },
          ],
          _pagination: {},
        }),
      });

      const messages = await service.getConversationHistory(user);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        kind: 'voice',
        text: 'Voice note',
        attachmentUrl: `/front-chat/attachment-proxy?url=${encodeURIComponent(audioUrl)}`,
      });
    });
  });

  // ── sendChannelTextMessage ───────────────────────────────────────────────────

  describe('sendChannelTextMessage', () => {
    const user = { id: 'user-1', email: 'user@example.com', name: 'Alex' };

    it('posts a JSON body with sender, body and a stable thread_ref', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 202, json: async () => ({}) });
      mockChatUserRepository.findOneBy.mockResolvedValue(buildChatUser());

      await service.sendChannelTextMessage(user, 'Hello there');

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api2.frontapp.com/channels/cha_test/incoming_messages');
      expect(init.method).toBe('POST');
      const body = JSON.parse(init.body);
      expect(body).toEqual(
        expect.objectContaining({
          sender: { handle: user.email, name: user.name },
          body: 'Hello there',
          body_format: 'markdown',
        }),
      );
      expect(body.metadata.thread_ref).toBe(`bloom-user-${user.id}`);
    });

    it('skips for Cypress test emails', async () => {
      await service.sendChannelTextMessage(
        { id: 'u', email: 'cypresstestemail+1@chayn.co', name: 'C' },
        'hi',
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('throws when Front returns non-2xx', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => 'Bad request',
      });
      await expect(service.sendChannelTextMessage(user, 'hi')).rejects.toThrow(
        'Front incoming_messages failed (422)',
      );
    });

    it('updates lastMessageSentAt on the ChatUser', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 202, json: async () => ({}) });
      const existing = buildChatUser();
      mockChatUserRepository.findOneBy.mockResolvedValue(existing);
      mockChatUserRepository.save.mockImplementation(async (data) => data);

      await service.sendChannelTextMessage(user, 'hi');

      // Allow micro-task queue to flush so fire-and-forget runs
      await new Promise((r) => setImmediate(r));

      expect(mockChatUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ lastMessageSentAt: expect.any(Date) }),
      );
    });
  });

  // ── sendChannelAttachment ────────────────────────────────────────────────────

  describe('sendChannelAttachment', () => {
    const user = { id: 'user-1', email: 'user@example.com', name: 'Alex' };
    const file: Express.Multer.File = {
      buffer: Buffer.from('binary'),
      mimetype: 'image/png',
      originalname: 'photo.png',
      size: 6,
    } as Express.Multer.File;

    it('posts multipart form-data with sender, attachment and thread_ref', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 202, json: async () => ({}) });
      mockChatUserRepository.findOneBy.mockResolvedValue(buildChatUser());

      await service.sendChannelAttachment(user, file);

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api2.frontapp.com/channels/cha_test/incoming_messages');
      expect(init.method).toBe('POST');
      const form = init.body as FormData;
      expect(form).toBeInstanceOf(FormData);
      expect(form.get('sender[handle]')).toBe(user.email);
      expect(form.get('metadata[thread_ref]')).toBe(`bloom-user-${user.id}`);
    });

    it('labels audio attachments as "Voice note"', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 202, json: async () => ({}) });
      mockChatUserRepository.findOneBy.mockResolvedValue(buildChatUser());

      await service.sendChannelAttachment(user, {
        ...file,
        mimetype: 'audio/webm',
        originalname: 'voice.webm',
      } as Express.Multer.File);

      const form = mockFetch.mock.calls[0][1].body as FormData;
      expect(form.get('body')).toBe('Voice note');
    });

    it('skips for Cypress test emails', async () => {
      await service.sendChannelAttachment(
        { id: 'u', email: 'cypresstestemail+1@chayn.co' },
        file,
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('throws when Front returns non-2xx', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 413,
        text: async () => 'Payload too large',
      });
      await expect(service.sendChannelAttachment(user, file)).rejects.toThrow(
        'Front attachment upload failed (413)',
      );
    });
  });
});
