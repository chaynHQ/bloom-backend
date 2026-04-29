import { Test, TestingModule } from '@nestjs/testing';
import { FrontChatService } from './front-chat.service';

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('src/utils/constants', () => ({
  frontChatApiToken: 'test-api-token',
  frontChannelId: 'cha_test',
  frontContactListId: 'grp_test',
}));

describe('FrontChatService', () => {
  let service: FrontChatService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [FrontChatService],
    }).compile();

    service = module.get<FrontChatService>(FrontChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createContact', () => {
    it('should create a new Front Chat contact and add it to the contact group', async () => {
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
        'https://api2.frontapp.com/contact_groups/grp_test/contacts',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ contact_ids: ['alt:email:user@example.com'] }),
        }),
      );
      expect(result).toEqual({ id: 'cnt_123', name: 'Test User' });
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

  describe('updateContactCustomFields', () => {
    it('should update custom fields and ensure the contact is in the group', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

      await service.updateContactCustomFields({ language: 'en' }, 'user@example.com');

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://api2.frontapp.com/contacts/alt:email:user@example.com',
        expect.objectContaining({ method: 'PATCH' }),
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://api2.frontapp.com/contact_groups/grp_test/contacts',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should create contact and retry if contact not found (404)', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404, text: async () => '404 not found' })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'cnt_new' }) }) // createContact
        .mockResolvedValueOnce({ ok: true, status: 204 }) // createContact's group add
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) }); // retry PATCH

      await service.updateContactCustomFields({ language: 'en' }, 'user@example.com');

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should skip for Cypress test emails', async () => {
      await service.updateContactCustomFields({ language: 'en' }, 'cypresstestemail+1@chayn.co');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('updateContactProfile', () => {
    it('should update name on an existing contact and ensure the contact is in the group', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

      await service.updateContactProfile({ name: 'New Name' }, 'user@example.com');

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://api2.frontapp.com/contacts/alt:email:user@example.com',
        expect.objectContaining({ method: 'PATCH' }),
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://api2.frontapp.com/contact_groups/grp_test/contacts',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should create contact and retry if contact not found (404)', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404, text: async () => '404 not found' })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'cnt_new' }) }) // createContact
        .mockResolvedValueOnce({ ok: true, status: 204 }) // createContact's group add
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) }); // retry PATCH

      await service.updateContactProfile({ name: 'New Name' }, 'user@example.com');

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should skip for Cypress test emails', async () => {
      await service.updateContactProfile({ name: 'Test' }, 'cypresstestemail+1@chayn.co');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('deleteContact', () => {
    it('should delete a Front Chat contact', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 204 });

      await service.deleteContact('user@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api2.frontapp.com/contacts/alt:email:user@example.com',
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

  describe('sendChannelTextMessage', () => {
    const user = { id: 'user-1', email: 'user@example.com', name: 'Alex' };

    it('posts a JSON body with sender, body and a stable thread_ref', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 202 });

      await service.sendChannelTextMessage(user, 'Hello there');

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api2.frontapp.com/channels/cha_test/incoming_messages');
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual(
        expect.objectContaining({
          Authorization: 'Bearer test-api-token',
          'Content-Type': 'application/json',
        }),
      );
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
  });

  describe('sendChannelAttachment', () => {
    const user = { id: 'user-1', email: 'user@example.com', name: 'Alex' };
    const file: Express.Multer.File = {
      buffer: Buffer.from('binary'),
      mimetype: 'image/png',
      originalname: 'photo.png',
      size: 6,
    } as Express.Multer.File;

    it('posts multipart form-data with sender, attachment and thread_ref', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 202 });

      await service.sendChannelAttachment(user, file);

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api2.frontapp.com/channels/cha_test/incoming_messages');
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({ Authorization: 'Bearer test-api-token' });

      const form = init.body as FormData;
      expect(form).toBeInstanceOf(FormData);
      expect(form.get('sender[handle]')).toBe(user.email);
      expect(form.get('sender[name]')).toBe(user.name);
      expect(form.get('metadata[thread_ref]')).toBe(`bloom-user-${user.id}`);
      expect(form.get('attachments')).toBeInstanceOf(Blob);
    });

    it('labels audio attachments as "Voice note"', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 202 });
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
