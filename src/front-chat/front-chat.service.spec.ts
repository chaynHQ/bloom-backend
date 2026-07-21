import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as nsfwjs from 'nsfwjs';
import { ChatUserService } from 'src/chat-user/chat-user.service';
import { ChatUserEntity } from 'src/entities/chat-user.entity';
import { UserEntity } from 'src/entities/user.entity';
import { EVENT_NAME } from 'src/event-logger/event-logger.interface';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { Logger } from 'src/logger/logger';
import { fetchFrontAttachment, FrontChatService } from './front-chat.service';
import { ImageScanningService } from './image-scanning.service';

const mockFetch = jest.fn();
global.fetch = mockFetch;

// Must be a literal here — jest.mock factories are hoisted before const declarations.
const TEST_SUPPORT_EMAIL = 'test-support@bloom.chayn.co';

jest.mock('src/utils/constants', () => ({
  ...jest.requireActual('src/utils/constants'),
  frontChatApiToken: 'test-api-token',
  frontChannelId: 'cha_test',
  frontContactListId: 'grp_test',
  frontSupportEmail: 'test-support@bloom.chayn.co',
}));

//TFJS // Controllable fake model —  tests classify() returns.
const mockClassify = jest.fn();
jest.mock('nsfwjs', () => ({
  load: jest.fn().mockResolvedValue({ classify: (...args) => mockClassify(...args) }),
}));
jest.mock('@tensorflow/tfjs-node', () => ({
  node: { decodeImage: jest.fn(() => ({ dispose: jest.fn() })) },
}));

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

describe('FrontChatService', () => {
  let service: FrontChatService;
  let chatUserService: jest.Mocked<
    Pick<
      ChatUserService,
      | 'getOrCreateChatUser'
      | 'getChatUser'
      | 'updateChatUserByEmail'
      | 'clearConversationId'
      | 'setLastMessageSentAt'
    >
  >;
  const mockUserRepository = {
    findOneBy: jest.fn(),
  };
  const eventLoggerService = { createEventLog: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.resetAllMocks();
    eventLoggerService.createEventLog.mockResolvedValue(undefined);

    chatUserService = {
      getOrCreateChatUser: jest
        .fn()
        .mockImplementation(async (userId) => buildChatUser({ userId })),
      getChatUser: jest.fn().mockResolvedValue(null),
      updateChatUserByEmail: jest.fn().mockResolvedValue(null),
      clearConversationId: jest.fn().mockResolvedValue(undefined),
      setLastMessageSentAt: jest.fn().mockImplementation(async (chatUser, sentAt) => ({
        ...chatUser,
        lastMessageSentAt: sentAt,
      })),
    };
    mockUserRepository.findOneBy.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FrontChatService,
        ImageScanningService,
        { provide: ChatUserService, useValue: chatUserService },
        { provide: EventLoggerService, useValue: eventLoggerService },
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<FrontChatService>(FrontChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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

      await service.createContact({ email: 'user@example.com', userId: 'user-1' });

      expect(chatUserService.getOrCreateChatUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ frontContactId: 'crd_abc' }),
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

      await expect(service.createContact({ email: 'user@example.com' })).resolves.toEqual({
        id: 'cnt_123',
      });
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

    it('throws when contact not found (404) rather than creating a partial contact', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => '404 not found',
      });

      await expect(
        service.updateContactCustomFields({ language: 'en' }, 'user@example.com'),
      ).rejects.toThrow('Update Front Chat contact custom fields API call failed');

      expect(mockFetch).toHaveBeenCalledTimes(1);
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

    it('throws when contact not found (404) rather than creating a partial contact', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => '404 not found',
      });

      await expect(
        service.updateContactProfile({ name: 'New Name' }, 'user@example.com'),
      ).rejects.toThrow('Update Front Chat contact profile API call failed');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('adds the custom channel handle fire-and-forget when email changes', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) }) // PATCH profile
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'crd_u1' }) }) // GET canonical ID
        .mockResolvedValueOnce({ ok: true, status: 204 }) // POST list
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) }); // PATCH custom handle

      await service.updateContactProfile(
        { email: 'new@example.com', name: 'New Name' },
        'old@example.com',
      );
      // Allow fire-and-forget addChannelHandle to settle
      await new Promise((r) => setImmediate(r));

      const urls = mockFetch.mock.calls.map((c) => c[0] as string);
      // Last call should be the addChannelHandle PATCH for the new email
      expect(urls[urls.length - 1]).toContain('alt:email:new%40example.com');
      expect(JSON.parse(mockFetch.mock.calls[mockFetch.mock.calls.length - 1][1].body)).toEqual({
        handles: [{ source: 'custom', handle: 'new@example.com' }],
      });
    });

    it('should skip for Cypress test emails', async () => {
      await service.updateContactProfile({ name: 'Test' }, 'cypresstestemail+1@chayn.co');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ── addChannelHandle ──────────────────────────────────────────────────────────

  describe('addChannelHandle', () => {
    it('PATCHes the custom handle on the contact alias', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });

      await service.addChannelHandle('user@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api2.frontapp.com/contacts/alt:email:user%40example.com',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ handles: [{ source: 'custom', handle: 'user@example.com' }] }),
        }),
      );
    });

    it('does not throw when the PATCH fails (non-fatal)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 422, text: async () => 'Duplicate' });

      await expect(service.addChannelHandle('user@example.com')).resolves.not.toThrow();
    });

    it('skips for Cypress test emails', async () => {
      await service.addChannelHandle('cypresstestemail+1@chayn.co');
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

    // Helper: mock the contact-conversations lookup to return no results.
    const mockEmptyContactLookup = () =>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ _results: [] }),
      });

    it('returns empty array when no ChatUser record exists and contact has no conversations', async () => {
      chatUserService.getChatUser.mockResolvedValueOnce(null);
      mockEmptyContactLookup();
      const result = await service.getConversationHistory(user);
      expect(result).toEqual({ messages: [], conversationFound: false });
    });

    it('returns empty array when ChatUser exists but frontConversationId is null and contact has no conversations', async () => {
      chatUserService.getChatUser.mockResolvedValueOnce(
        buildChatUser({ frontConversationId: null }),
      );
      mockEmptyContactLookup();
      const result = await service.getConversationHistory(user);
      expect(result).toEqual({ messages: [], conversationFound: false });
    });

    it('uses contact conversation lookup to find and cache frontConversationId when absent', async () => {
      chatUserService.getChatUser.mockResolvedValueOnce(
        buildChatUser({ frontConversationId: null }),
      );
      const inboxUrl = 'https://api2.frontapp.com/inboxes/inb_test';
      // First fetch: getInboxId → /channels/{id}
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ _links: { related: { inbox: inboxUrl } } }),
      });
      // Second fetch: contact conversations lookup
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          _results: [{ id: 'cnv_found', _links: { related: { inbox: inboxUrl } } }],
        }),
      });
      // Third fetch: messages for found conversation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ _results: [], _pagination: {} }),
      });

      await service.getConversationHistory(user);

      const inboxUrl2 = mockFetch.mock.calls[0][0] as string;
      expect(inboxUrl2).toContain('/channels/cha_test');
      const contactsUrl = mockFetch.mock.calls[1][0] as string;
      expect(contactsUrl).toContain('/contacts/alt:email:user%40example.com/conversations');
      const messagesUrl = mockFetch.mock.calls[2][0] as string;
      expect(messagesUrl).toContain('/conversations/cnv_found/messages');
    });

    it('fetches messages using the stored frontConversationId', async () => {
      chatUserService.getChatUser.mockResolvedValueOnce(
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
      expect(result).toEqual({ messages: [], conversationFound: false });
    });

    it('maps inbound messages as user and outbound as agent, sorted chronologically', async () => {
      chatUserService.getChatUser.mockResolvedValueOnce(
        buildChatUser({ frontConversationId: 'cnv_abc' }),
      );
      const now = Math.floor(Date.now() / 1000);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          _results: [
            {
              id: 'msg_2',
              is_inbound: false,
              text: 'Hi there',
              created_at: now,
              author: { first_name: 'Agent', last_name: 'One' },
            },
            { id: 'msg_1', is_inbound: true, text: 'Hello', created_at: now - 10 },
          ],
          _pagination: {},
        }),
      });

      const { messages } = await service.getConversationHistory(user);

      expect(messages).toHaveLength(2);
      expect(messages[0]).toMatchObject({ id: 'msg_1', direction: 'user', text: 'Hello' });
      expect(messages[1]).toMatchObject({
        id: 'msg_2',
        direction: 'agent',
        text: 'Hi there',
        authorName: 'Agent One',
      });
    });

    it('paginates through all messages when _pagination.next is set', async () => {
      chatUserService.getChatUser.mockResolvedValueOnce(
        buildChatUser({ frontConversationId: 'cnv_abc' }),
      );
      const now = Math.floor(Date.now() / 1000);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            _results: [{ id: 'msg_1', is_inbound: true, text: 'First', created_at: now - 20 }],
            _pagination: {
              next: 'https://api2.frontapp.com/conversations/cnv_abc/messages?limit=100&after=cursor1',
            },
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

      const { messages } = await service.getConversationHistory(user);

      expect(messages).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('clears stale frontConversationId on 404 and returns empty', async () => {
      chatUserService.getChatUser.mockResolvedValueOnce(
        buildChatUser({ frontConversationId: 'cnv_stale' }),
      );
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'not found' });

      const result = await service.getConversationHistory(user);

      expect(result).toEqual({ messages: [], conversationFound: false });
      expect(chatUserService.clearConversationId).toHaveBeenCalledWith('user-1');
    });

    it('maps image attachment messages with an attachments entry on the proxy path', async () => {
      chatUserService.getChatUser.mockResolvedValueOnce(
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
              attachments: [
                { url: attachmentUrl, filename: 'photo.jpg', content_type: 'image/jpeg' },
              ],
            },
          ],
          _pagination: {},
        }),
      });

      const { messages } = await service.getConversationHistory(user);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        id: 'msg_1',
        text: 'photo.jpg',
        attachments: [
          {
            url: `/front-chat/attachment-proxy?url=${encodeURIComponent(attachmentUrl)}`,
            name: 'photo.jpg',
            kind: 'image',
          },
        ],
      });
    });

    it('skips messages with no text and no image attachment', async () => {
      chatUserService.getChatUser.mockResolvedValueOnce(
        buildChatUser({ frontConversationId: 'cnv_abc' }),
      );
      const now = Math.floor(Date.now() / 1000);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          _results: [{ id: 'msg_1', is_inbound: true, body: '', text: '', created_at: now }],
          _pagination: {},
        }),
      });

      const { messages } = await service.getConversationHistory(user);
      expect(messages).toHaveLength(0);
    });

    it('parses markdown image links from body as image attachments (Channel API imported messages)', async () => {
      chatUserService.getChatUser.mockResolvedValueOnce(
        buildChatUser({ frontConversationId: 'cnv_abc' }),
      );
      const now = Math.floor(Date.now() / 1000);
      const imageUrl = 'https://chayn.api.frontapp.com/messages/msg_1/download/fil_1';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          _results: [
            {
              id: 'msg_1',
              is_inbound: true,
              body: `![photo.jpg](${imageUrl})`,
              created_at: now,
            },
          ],
          _pagination: {},
        }),
      });

      const { messages } = await service.getConversationHistory(user);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        id: 'msg_1',
        text: 'photo.jpg',
        attachments: [
          {
            url: `/front-chat/attachment-proxy?url=${encodeURIComponent(imageUrl)}`,
            name: 'photo.jpg',
            kind: 'image',
          },
        ],
      });
    });

    it('marks imported operator messages as agent when author email matches support address', async () => {
      chatUserService.getChatUser.mockResolvedValueOnce(
        buildChatUser({ frontConversationId: 'cnv_abc' }),
      );
      const now = Math.floor(Date.now() / 1000);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          _results: [
            {
              id: 'msg_1',
              is_inbound: true,
              text: 'Hello from user',
              created_at: now - 10,
            },
            {
              id: 'msg_2',
              is_inbound: true,
              text: 'Reply from support',
              created_at: now,
              // Imported operator message — handle was FRONT_SUPPORT_EMAIL
              author: { email: TEST_SUPPORT_EMAIL },
            },
          ],
          _pagination: {},
        }),
      });

      const { messages } = await service.getConversationHistory(user);

      expect(messages).toHaveLength(2);
      expect(messages[0]).toMatchObject({ id: 'msg_1', direction: 'user' });
      expect(messages[1]).toMatchObject({ id: 'msg_2', direction: 'agent' });
    });
  });

  describe('getConversationHistory — audio attachments', () => {
    const user = { id: 'user-1', email: 'user@example.com', name: 'Alex' };

    it('maps audio attachment messages with kind=voice and a proxy URL on attachments', async () => {
      chatUserService.getChatUser.mockResolvedValueOnce(
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
              attachments: [
                { url: audioUrl, filename: 'voice-note.webm', content_type: 'audio/webm' },
              ],
            },
          ],
          _pagination: {},
        }),
      });

      const { messages } = await service.getConversationHistory(user);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        text: 'Voice note',
        attachments: [
          {
            url: `/front-chat/attachment-proxy?url=${encodeURIComponent(audioUrl)}`,
            name: 'voice-note.webm',
            kind: 'voice',
          },
        ],
      });
    });

    it('maps every attachment on a multi-attachment message, preserving order', async () => {
      chatUserService.getChatUser.mockResolvedValueOnce(
        buildChatUser({ frontConversationId: 'cnv_abc' }),
      );
      const now = Math.floor(Date.now() / 1000);
      const imageUrl = 'https://api2.frontapp.com/download/att_1/photo.png';
      const fileUrl = 'https://api2.frontapp.com/download/att_2/notes.txt';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          _results: [
            {
              id: 'msg_1',
              is_inbound: false,
              body: 'Here you go',
              text: 'Here you go',
              created_at: now,
              attachments: [
                { url: imageUrl, filename: 'photo.png', content_type: 'image/png' },
                { url: fileUrl, filename: 'notes.txt', content_type: 'text/plain' },
              ],
            },
          ],
          _pagination: {},
        }),
      });

      const { messages } = await service.getConversationHistory(user);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        text: 'Here you go',
        attachments: [
          {
            url: `/front-chat/attachment-proxy?url=${encodeURIComponent(imageUrl)}`,
            name: 'photo.png',
            kind: 'image',
          },
          {
            url: `/front-chat/attachment-proxy?url=${encodeURIComponent(fileUrl)}`,
            name: 'notes.txt',
            kind: 'file',
          },
        ],
      });
    });
  });

  // ── sendChannelTextMessage ───────────────────────────────────────────────────

  describe('sendChannelTextMessage', () => {
    const user = { id: 'user-1', email: 'user@example.com', name: 'Alex' };

    it('posts a JSON body with sender, body and a stable thread_ref', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 202, json: async () => ({}) });

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
      expect(eventLoggerService.createEventLog).not.toHaveBeenCalled();
    });

    it('logs a CHAT_MESSAGE_SENT event for the user', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 202, json: async () => ({}) });

      await service.sendChannelTextMessage(user, 'hi');
      await new Promise((r) => setImmediate(r));

      expect(eventLoggerService.createEventLog).toHaveBeenCalledWith({
        userId: user.id,
        event: EVENT_NAME.CHAT_MESSAGE_SENT,
        date: expect.any(Date),
      });
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

    it('updates lastMessageSentAt on the ChatUser via ChatUserService', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 202, json: async () => ({}) });

      await service.sendChannelTextMessage(user, 'hi');

      // Allow micro-task queue to flush so fire-and-forget runs
      await new Promise((r) => setImmediate(r));

      expect(chatUserService.setLastMessageSentAt).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Date),
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

      await service.sendChannelAttachment(user, {
        ...file,
        mimetype: 'audio/webm',
        originalname: 'voice.webm',
      } as Express.Multer.File);

      const form = mockFetch.mock.calls[0][1].body as FormData;
      expect(form.get('body')).toBe('Voice note');
    });

    it('skips for Cypress test emails', async () => {
      await service.sendChannelAttachment({ id: 'u', email: 'cypresstestemail+1@chayn.co' }, file);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(eventLoggerService.createEventLog).not.toHaveBeenCalled();
    });

    it('logs a CHAT_MESSAGE_SENT event for the user', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 202, json: async () => ({}) });

      await service.sendChannelAttachment(user, file);
      await new Promise((r) => setImmediate(r));

      expect(eventLoggerService.createEventLog).toHaveBeenCalledWith({
        userId: user.id,
        event: EVENT_NAME.CHAT_MESSAGE_SENT,
        date: expect.any(Date),
      });
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

    //IMG scan ────────────────────────────────────────

    it('blocks an explicit image and never forwards it', async () => {
      (nsfwjs.load as jest.Mock).mockResolvedValue({
        classify: (...args: unknown[]) => mockClassify(...args),
      });
      await (service as any).imageScanningService.onModuleInit();
      mockClassify.mockResolvedValue([{ className: 'Porn', probability: 0.9 }]);

      await expect(service.sendChannelAttachment(user, file)).rejects.toThrow();

      const uploadCall = mockFetch.mock.calls.find(([, init]) => init?.body instanceof FormData);
      expect(uploadCall).toBeUndefined();
    });

    it('raises a Rollbar alert (logger.error) when blocking', async () => {
      (nsfwjs.load as jest.Mock).mockResolvedValue({
        classify: (...args: unknown[]) => mockClassify(...args),
      });
      await (service as any).imageScanningService.onModuleInit();
      mockClassify.mockResolvedValue([{ className: 'Porn', probability: 0.9 }]);
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

      await expect(service.sendChannelAttachment(user, file)).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Blocked explicit image'));
      errorSpy.mockRestore();
    });

    /*     it(' a thread note when blocking', async () => {
      await (service as any).imageScanningService.onModuleInit();
      mockClassify.mockResolvedValue([{ className: 'Porn', probability: 0.9 }]);
      const noteSpy = jest.spyOn(service, 'sendChannelTextMessage').mockResolvedValue(null);

      await expect(service.sendChannelAttachment(user, file)).rejects.toThrow();

      expect(noteSpy).toHaveBeenCalledWith(user, expect.stringContaining('blocked'));
    }); */

    it('forwards a safe image normally', async () => {
      mockClassify.mockResolvedValue([{ className: 'Neutral', probability: 0.95 }]);
      mockFetch.mockResolvedValue({ ok: true, status: 202, json: async () => ({}) });

      await service.sendChannelAttachment(user, file);

      const uploadCall = mockFetch.mock.calls.find(([, init]) => init?.body instanceof FormData);
      expect(uploadCall).toBeDefined();
    });

    it('forwards an image scoring below the threshold', async () => {
      mockClassify.mockResolvedValue([{ className: 'Sexy', probability: 0.4 }]);
      mockFetch.mockResolvedValue({ ok: true, status: 202, json: async () => ({}) });

      await service.sendChannelAttachment(user, file);

      const uploadCall = mockFetch.mock.calls.find(([, init]) => init?.body instanceof FormData);
      expect(uploadCall).toBeDefined();
    });

    it('does not scan non-image files', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 202, json: async () => ({}) });
      const pdf = {
        ...file,
        mimetype: 'application/pdf',
        originalname: 'doc.pdf',
      } as Express.Multer.File;

      await service.sendChannelAttachment(user, pdf);

      expect(mockClassify).not.toHaveBeenCalled();
    });
  });
});

// ── fetchFrontAttachment (module-level) ────────────────────────────────────────

const VALID_FRONT_URL = 'https://chayneb55.api.frontapp.com/messages/msg_abc/download/fil_xyz';

describe('fetchFrontAttachment', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns buffer directly when Front responds with 200 (no redirect)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: (k: string) => (k === 'content-type' ? 'image/jpeg' : null) },
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    });

    const result = await fetchFrontAttachment(VALID_FRONT_URL);

    expect(result.contentType).toBe('image/jpeg');
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('fetches CDN Location URL without auth when Front returns a redirect', async () => {
    const cdnUrl = 'https://s3.amazonaws.com/bucket/file?X-Amz-Signature=abc';
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 302,
        headers: { get: (k: string) => (k === 'location' ? cdnUrl : null) },
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'audio/webm' },
        arrayBuffer: async () => new ArrayBuffer(0),
      });

    const result = await fetchFrontAttachment(VALID_FRONT_URL);

    // Initial call: rebuilt URL with manual redirect.
    expect(mockFetch.mock.calls[0][0]).toBe(VALID_FRONT_URL);
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ redirect: 'manual' });
    // CDN follow-up: no Authorization header (would be rejected by S3 presigned URL).
    expect(mockFetch.mock.calls[1][0]).toBe(cdnUrl);
    expect(result.contentType).toBe('audio/webm');
  });

  it('rejects redirects to non-AWS hosts', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 302,
      headers: { get: (k: string) => (k === 'location' ? 'https://evil.com/file' : null) },
    });

    await expect(fetchFrontAttachment(VALID_FRONT_URL)).rejects.toThrow(
      'Disallowed redirect target',
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws when Front returns non-ok and non-redirect', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: { get: () => null },
    });

    await expect(fetchFrontAttachment(VALID_FRONT_URL)).rejects.toThrow(
      'Front attachment fetch failed (403)',
    );
  });

  it('throws when CDN returns non-ok status', async () => {
    const cdnUrl = 'https://s3.amazonaws.com/bucket/file?X-Amz-Signature=abc';
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 302,
        headers: { get: (k: string) => (k === 'location' ? cdnUrl : null) },
      })
      .mockResolvedValueOnce({ ok: false, status: 403 });

    await expect(fetchFrontAttachment(VALID_FRONT_URL)).rejects.toThrow('CDN fetch failed (403)');
  });

  it('rejects URLs whose hostname is not a Front tenant', async () => {
    await expect(fetchFrontAttachment('https://evil.com/messages/m/download/f')).rejects.toThrow(
      'Invalid attachment URL',
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects URLs whose path does not match the download template', async () => {
    await expect(
      fetchFrontAttachment('https://chayneb55.api.frontapp.com/internal/admin'),
    ).rejects.toThrow('Invalid attachment URL');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects http:// URLs', async () => {
    await expect(
      fetchFrontAttachment('http://chayneb55.api.frontapp.com/messages/m/download/f'),
    ).rejects.toThrow('Invalid attachment URL');
  });
});
