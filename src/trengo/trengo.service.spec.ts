import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { EVENT_NAME } from 'src/event-logger/event-logger.interface';
import { TrengoService } from './trengo.service';
import { TrengoWebhookDto } from './dtos/trengo-webhook.dto';

// Mock axios
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => mockAxiosInstance),
  },
}));

const mockWebhookPayload: TrengoWebhookDto = {
  message_id: 1001,
  ticket_id: 2001,
  contact_id: 3001,
  channel_id: 4001,
  message: 'Hello, this is a test message',
  contact: {
    id: 3001,
    identifier: 'user@example.com',
    name: 'Test User',
    email: 'user@example.com',
  },
};

describe('TrengoService', () => {
  let service: TrengoService;
  let mockEventLoggerService: DeepMocked<EventLoggerService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockEventLoggerService = createMock<EventLoggerService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrengoService,
        { provide: EventLoggerService, useValue: mockEventLoggerService },
      ],
    }).compile();

    service = module.get<TrengoService>(TrengoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleTrengoWebhookEvent', () => {
    it('should create an event log for inbound message', async () => {
      await service.handleTrengoWebhookEvent(mockWebhookPayload, EVENT_NAME.CHAT_MESSAGE_SENT);

      expect(mockEventLoggerService.createEventLog).toHaveBeenCalledWith(
        { event: EVENT_NAME.CHAT_MESSAGE_SENT, date: expect.any(Date) },
        'user@example.com',
      );
    });

    it('should create an event log for outbound message', async () => {
      await service.handleTrengoWebhookEvent(
        mockWebhookPayload,
        EVENT_NAME.CHAT_MESSAGE_RECEIVED,
      );

      expect(mockEventLoggerService.createEventLog).toHaveBeenCalledWith(
        { event: EVENT_NAME.CHAT_MESSAGE_RECEIVED, date: expect.any(Date) },
        'user@example.com',
      );
    });

    it('should look up contact by id when email is not in payload', async () => {
      const payloadWithoutEmail: TrengoWebhookDto = {
        ...mockWebhookPayload,
        contact: undefined,
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          id: 3001,
          identifier: 'looked-up@example.com',
          name: 'Looked Up User',
          email: 'looked-up@example.com',
        },
      });

      await service.handleTrengoWebhookEvent(payloadWithoutEmail, EVENT_NAME.CHAT_MESSAGE_SENT);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/contacts/3001');
      expect(mockEventLoggerService.createEventLog).toHaveBeenCalledWith(
        { event: EVENT_NAME.CHAT_MESSAGE_SENT, date: expect.any(Date) },
        'looked-up@example.com',
      );
    });

    it('should warn and return when email cannot be resolved', async () => {
      const payloadNoContact: TrengoWebhookDto = {
        message_id: 1001,
        ticket_id: 2001,
      };

      await service.handleTrengoWebhookEvent(payloadNoContact, EVENT_NAME.CHAT_MESSAGE_SENT);

      expect(mockEventLoggerService.createEventLog).not.toHaveBeenCalled();
    });

    it('should throw an error when event handling fails', async () => {
      mockEventLoggerService.createEventLog.mockRejectedValue(new Error('DB Error'));

      await expect(
        service.handleTrengoWebhookEvent(mockWebhookPayload, EVENT_NAME.CHAT_MESSAGE_SENT),
      ).rejects.toThrow(/Failed to handle Trengo webhook event for CHAT_MESSAGE_SENT/);
    });
  });

  describe('createTrengoContact', () => {
    it('should create a new contact', async () => {
      const expectedResponse = { id: 1, identifier: 'test@example.com', name: 'Test User' };
      mockAxiosInstance.post.mockResolvedValue({ data: expectedResponse });

      const response = await service.createTrengoContact({
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining('/channels/'),
        { identifier: 'test@example.com', name: 'Test User' },
      );
      expect(response).toEqual(expectedResponse);
    });

    it('should skip Cypress test emails', async () => {
      const response = await service.createTrengoContact({
        email: 'cypresstestemail+123@chayn.co',
      });
      expect(response).toBeNull();
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('should throw an error if contact creation fails', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('API failed'));
      await expect(
        service.createTrengoContact({ email: 'fail@example.com' }),
      ).rejects.toThrow(/Create Trengo contact API call failed/);
    });
  });

  describe('updateTrengoContactBase', () => {
    it('should update an existing contact', async () => {
      // Mock findContactByEmail
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: [{ id: 1, identifier: 'test@example.com', name: 'Old Name' }],
        },
      });
      mockAxiosInstance.put.mockResolvedValue({ data: {} });

      await service.updateTrengoContactBase(
        { name: 'New Name' },
        'test@example.com',
      );

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/contacts/1', { name: 'New Name' });
    });

    it('should skip Cypress test emails', async () => {
      const response = await service.updateTrengoContactBase(
        { name: 'Test' },
        'cypresstestemail+123@chayn.co',
      );
      expect(response).toBeNull();
    });

    it('should throw an error if update fails', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API error'));
      await expect(
        service.updateTrengoContactBase({ name: 'Test' }, 'test@example.com'),
      ).rejects.toThrow(/Update Trengo contact base API call failed/);
    });
  });

  describe('updateTrengoContactCustomFields', () => {
    it('should skip Cypress test emails', async () => {
      const response = await service.updateTrengoContactCustomFields(
        { language: 'en' },
        'cypresstestemail+123@chayn.co',
      );
      expect(response).toBeNull();
    });

    it('should throw when contact not found and creation fails', async () => {
      // findContactByEmail returns null both times
      mockAxiosInstance.get.mockResolvedValue({ data: { data: [] } });
      // createTrengoContact fails
      mockAxiosInstance.post.mockRejectedValue(new Error('Create failed'));

      await expect(
        service.updateTrengoContactCustomFields({ language: 'en' }, 'test@example.com'),
      ).rejects.toThrow(/Update Trengo contact custom fields API call failed/);
    });
  });

  describe('deleteTrengoContact', () => {
    it('should delete a contact found by email', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: [{ id: 42, identifier: 'test@example.com' }],
        },
      });
      mockAxiosInstance.delete.mockResolvedValue({});

      await service.deleteTrengoContact('test@example.com');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/contacts/42');
    });

    it('should not throw if contact is not found', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: [] } });

      await expect(service.deleteTrengoContact('notfound@example.com')).resolves.not.toThrow();
      expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
    });

    it('should throw if delete API call fails', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: [{ id: 42, identifier: 'test@example.com' }],
        },
      });
      mockAxiosInstance.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteTrengoContact('test@example.com')).rejects.toThrow(
        /Delete Trengo contact API call failed/,
      );
    });
  });

  describe('deleteCypressTrengoContacts', () => {
    it('should delete all contacts matching cypress search', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: [
            { id: 1, identifier: 'cypresstestemail+1@chayn.co' },
            { id: 2, identifier: 'cypresstestemail+2@chayn.co' },
          ],
          meta: { current_page: 1, last_page: 1 },
        },
      });
      mockAxiosInstance.delete.mockResolvedValue({});

      await service.deleteCypressTrengoContacts();

      expect(mockAxiosInstance.delete).toHaveBeenCalledTimes(2);
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/contacts/1');
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/contacts/2');
    });

    it('should throw if search fails', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Search failed'));

      await expect(service.deleteCypressTrengoContacts()).rejects.toThrow(
        /Delete cypress Trengo contacts API call failed/,
      );
    });
  });

  describe('getMessageChannelAnalytics', () => {
    it('should calculate message channel analytics', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: [
            { contact_id: 1, user_id: null, channel_type: 'chat' },
            { contact_id: 1, user_id: null, channel_type: 'email' },
            { contact_id: null, user_id: 5, channel_type: 'chat' }, // agent message, should not count
            { contact_id: 1, user_id: null, channel_type: 'chat' },
          ],
        },
      });

      const result = await service.getMessageChannelAnalytics([1001]);

      expect(result).toContain('67%) chat widget origin');
      expect(result).toContain('33%) email origin');
    });

    it('should handle empty ticket list', async () => {
      const result = await service.getMessageChannelAnalytics([]);
      expect(result).toContain('0%) chat widget origin');
      expect(result).toContain('0%) email origin');
    });

    it('should handle API errors gracefully', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API Error'));

      const result = await service.getMessageChannelAnalytics([1001]);
      expect(result).toContain('0%) chat widget origin');
      expect(result).toContain('0%) email origin');
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return false for missing signature', () => {
      const result = service.verifyWebhookSignature(Buffer.from('body'), '');
      expect(result).toBe(false);
    });

    it('should return false for malformed signature', () => {
      const result = service.verifyWebhookSignature(Buffer.from('body'), 'invalid');
      expect(result).toBe(false);
    });
  });
});
