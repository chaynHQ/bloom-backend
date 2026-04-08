import { Test, TestingModule } from '@nestjs/testing';
import { FrontChatService } from './front-chat.service';

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('src/utils/constants', () => ({
  frontChatApiToken: 'test-api-token',
  frontChatIdentitySecret: 'test-identity-secret',
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

  describe('computeUserHash', () => {
    it('should return a deterministic HMAC-SHA256 hex hash for a given email', () => {
      const hash = service.computeUserHash('user@example.com');
      expect(typeof hash).toBe('string');
      expect(hash).toHaveLength(64); // SHA-256 hex = 64 chars
      expect(hash).toBe(service.computeUserHash('user@example.com'));
    });

    it('should return different hashes for different emails', () => {
      expect(service.computeUserHash('a@example.com')).not.toBe(
        service.computeUserHash('b@example.com'),
      );
    });
  });

  describe('createContact', () => {
    it('should create a new Front Chat contact', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'cnt_123', name: 'Test User' }),
      });

      const result = await service.createContact({
        email: 'user@example.com',
        name: 'Test User',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api2.frontapp.com/contacts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-api-token' }),
        }),
      );
      expect(result).toEqual({ id: 'cnt_123', name: 'Test User' });
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
    it('should update custom fields on a contact', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

      await service.updateContactCustomFields({ language: 'en' }, 'user@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api2.frontapp.com/contacts/alt:email:user@example.com',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    it('should create contact and retry if contact not found (404)', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404, text: async () => '404 not found' })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'cnt_new' }) }) // createContact
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) }); // retry PATCH

      await service.updateContactCustomFields({ language: 'en' }, 'user@example.com');

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should skip for Cypress test emails', async () => {
      await service.updateContactCustomFields({ language: 'en' }, 'cypresstestemail+1@chayn.co');
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
});
