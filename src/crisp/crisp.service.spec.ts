import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { crispWebsiteId } from 'src/utils/constants';
import { EVENT_NAME } from './crisp.interface';
import { CrispEventDto } from './dtos/crisp.dto';

// Mock implementation of the Crisp API methods
const mockWebsite = {
  getConversationMetas: jest.fn(),
  addNewPeopleProfile: jest.fn(),
  getPeopleProfile: jest.fn(),
  getPeopleData: jest.fn(),
  updatePeopleProfile: jest.fn(),
  updatePeopleData: jest.fn(),
  removePeopleProfile: jest.fn(),
  listPeopleProfiles: jest.fn(),
  listPeopleConversations: jest.fn(),
  getMessagesInConversation: jest.fn(),
};

// Mock the Crisp module
jest.mock('crisp-api', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      authenticateTier: jest.fn(),
      website: mockWebsite,
    })),
  };
});

import { CrispService } from './crisp.service';

const mockMessage: CrispEventDto = {
  website_id: 'test_website_id',
  session_id: 'test_session_id',
  inbox_id: 'inbox_id',
  type: 'message',
  origin: 'chat',
  content: 'Hello, this is a test message',
  from: 'user',
  timestamp: Date.now(),
  fingerprint: 1234567890,
  stamped: false,
  user: {
    email: 'user@example.com',
    nickname: 'Test User',
    user_id: 'user123',
  },
};

describe('CrispService', () => {
  let service: CrispService;
  let mockEventLoggerService: DeepMocked<EventLoggerService>;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Set up the mock return values
    mockWebsite.getConversationMetas.mockResolvedValue({
      email: 'test@example.com',
    });

    mockEventLoggerService = createMock<EventLoggerService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CrispService, { provide: EventLoggerService, useValue: mockEventLoggerService }],
    }).compile();

    service = module.get<CrispService>(CrispService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCrispEvent', () => {
    it('should create an event log for a valid event', async () => {
      const mockEvent: CrispEventDto = mockMessage;

      await service.handleCrispEvent(mockEvent, EVENT_NAME.CHAT_MESSAGE_RECEIVED);

      // Check that getConversationMetas was called with the correct parameters
      expect(mockWebsite.getConversationMetas).toHaveBeenCalledWith(
        mockEvent.website_id,
        mockEvent.session_id,
      );

      // Check that createEventLog was called with the correct parameters
      expect(mockEventLoggerService.createEventLog).toHaveBeenCalledWith(
        { event: EVENT_NAME.CHAT_MESSAGE_RECEIVED, date: expect.any(Date) },
        'test@example.com',
      );
    });

    it('should skip logging for resolved conversations', async () => {
      // Create a resolved conversation event
      const resolvedEvent: CrispEventDto = {
        ...mockMessage,
        content: { namespace: 'state:resolved' },
      } as unknown as CrispEventDto; // Type cast to handle the different content structure

      await service.handleCrispEvent(resolvedEvent, EVENT_NAME.CHAT_MESSAGE_RECEIVED);

      // Verify that we didn't call getConversationMetas and createEventLog
      expect(mockWebsite.getConversationMetas).not.toHaveBeenCalled();
      expect(mockEventLoggerService.createEventLog).not.toHaveBeenCalled();
    });

    it('should throw an error when handleCrispEvent fails', async () => {
      // Mock an API error
      mockWebsite.getConversationMetas.mockRejectedValue(new Error('API Error'));

      await expect(
        service.handleCrispEvent(mockMessage, EVENT_NAME.CHAT_MESSAGE_SENT),
      ).rejects.toThrow(/Failed to handle crisp event for CHAT_MESSAGE_SENT/);
    });
  });

  describe('createCrispProfile', () => {
    it('should create a new Crisp profile', async () => {
      const newProfile = { email: 'test@example.com', nickname: 'Test User' };
      const expectedResponse = { ...newProfile, user_id: 'test123' };

      mockWebsite.addNewPeopleProfile.mockResolvedValue(expectedResponse);

      const response = await service.createCrispProfile(newProfile);

      expect(mockWebsite.addNewPeopleProfile).toHaveBeenCalledWith(crispWebsiteId, newProfile);
      expect(response).toEqual(expectedResponse);
    });

    it('should throw an error if Crisp profile creation fails', async () => {
      // Mock the specific error we want to check
      mockWebsite.addNewPeopleProfile.mockImplementation(() => {
        throw new Error('API failed');
      });

      // Now test that calling the service method rejects
      await expect(service.createCrispProfile({ email: 'fail@example.com' })).rejects.toThrow(); // Just check that it throws any error
    });
  });

  describe('getCrispProfile', () => {
    it('should return a Crisp profile for a valid email', async () => {
      const mockProfile = { email: 'test@example.com', nickname: 'Test User' };
      mockWebsite.getPeopleProfile.mockResolvedValue(mockProfile);

      const profile = await service.getCrispProfile('test@example.com');

      expect(mockWebsite.getPeopleProfile).toHaveBeenCalledWith(crispWebsiteId, 'test@example.com');
      expect(profile).toEqual(mockProfile);
    });

    it('should throw an error if fetching the Crisp profile fails', async () => {
      // Mock the specific error we want to check
      mockWebsite.getPeopleProfile.mockImplementation(() => {
        throw new Error('API failed');
      });

      // Now test that calling the service method rejects
      await expect(service.getCrispProfile('test@example.com')).rejects.toThrow(); // Just check that it throws any error
    });
  });

  describe('getCrispPeopleData', () => {
    it('should return Crisp people data for a valid email', async () => {
      const mockPeopleData = {
        data: {
          customField1: 'value1',
          customField2: 'value2',
        },
      };
      mockWebsite.getPeopleData.mockResolvedValue(mockPeopleData);

      const peopleData = await service.getCrispPeopleData('test@example.com');

      expect(mockWebsite.getPeopleData).toHaveBeenCalledWith(crispWebsiteId, 'test@example.com');
      expect(peopleData).toEqual(mockPeopleData);
    });

    it('should throw an error if fetching Crisp people data fails', async () => {
      mockWebsite.getPeopleData.mockRejectedValue(new Error('API Error'));

      await expect(service.getCrispPeopleData('test@example.com')).rejects.toThrow();
    });
  });

  describe('updateCrispProfileBase', () => {
    it('should update a Crisp profile base', async () => {
      const profileUpdate = { person: { nickname: 'Updated User' } };
      const expectedResponse = { email: 'test@example.com', person: { nickname: 'Updated User' } };

      mockWebsite.updatePeopleProfile.mockResolvedValue(expectedResponse);

      const response = await service.updateCrispProfileBase(profileUpdate, 'test@example.com');

      expect(mockWebsite.updatePeopleProfile).toHaveBeenCalledWith(
        crispWebsiteId,
        'test@example.com',
        profileUpdate,
      );
      expect(response).toEqual(expectedResponse);
    });

    it('should throw an error if updating Crisp profile base fails', async () => {
      mockWebsite.updatePeopleProfile.mockRejectedValue(new Error('Update failed'));

      await expect(
        service.updateCrispProfileBase({ person: { nickname: 'Test' } }, 'test@example.com'),
      ).rejects.toThrow();
    });
  });

  describe('updateCrispPeopleData', () => {
    it('should update Crisp people data', async () => {
      const customFields = { language: 'en' };
      const expectedResponse = {
        data: {
          language: 'en',
        },
      };

      mockWebsite.updatePeopleData.mockResolvedValue(expectedResponse);

      const response = await service.updateCrispPeopleData(customFields, 'test@example.com');

      expect(mockWebsite.updatePeopleData).toHaveBeenCalledWith(
        crispWebsiteId,
        'test@example.com',
        customFields,
      );
      expect(response).toEqual(expectedResponse);
    });

    it('should throw an error if updating Crisp people data fails', async () => {
      mockWebsite.updatePeopleData.mockRejectedValue(new Error('Update failed'));

      await expect(
        service.updateCrispPeopleData({ language: 'en' }, 'test@example.com'),
      ).rejects.toThrow();
    });
  });

  describe('deleteCrispProfile', () => {
    it('should delete a Crisp profile', async () => {
      mockWebsite.removePeopleProfile.mockResolvedValue(undefined);

      await service.deleteCrispProfile('test@example.com');

      expect(mockWebsite.removePeopleProfile).toHaveBeenCalledWith(
        crispWebsiteId,
        'test@example.com',
      );
    });

    it('should throw an error if Crisp profile deletion fails', async () => {
      mockWebsite.removePeopleProfile.mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteCrispProfile('fail@example.com')).rejects.toThrow(
        'Delete crisp profile API call failed',
      );
    });
  });

  describe('deleteCypressCrispProfiles', () => {
    it('should delete all Cypress Crisp profiles', async () => {
      const mockProfiles = [
        { email: 'cypresstestemail+1@example.com' },
        { email: 'cypresstestemail+2@example.com' },
      ];

      mockWebsite.listPeopleProfiles.mockResolvedValue(mockProfiles);
      mockWebsite.removePeopleProfile.mockResolvedValue(undefined);

      await service.deleteCypressCrispProfiles();

      expect(mockWebsite.listPeopleProfiles).toHaveBeenCalledWith(
        crispWebsiteId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'cypresstestemail+',
      );

      expect(mockWebsite.removePeopleProfile).toHaveBeenCalledTimes(2);
      expect(mockWebsite.removePeopleProfile).toHaveBeenCalledWith(
        crispWebsiteId,
        'cypresstestemail+1@example.com',
      );
      expect(mockWebsite.removePeopleProfile).toHaveBeenCalledWith(
        crispWebsiteId,
        'cypresstestemail+2@example.com',
      );
    });

    it('should throw an error if listing Cypress profiles fails', async () => {
      mockWebsite.listPeopleProfiles.mockRejectedValue(new Error('List failed'));

      await expect(service.deleteCypressCrispProfiles()).rejects.toThrow(
        'Delete cypress crisp profiles API call failed',
      );
    });
  });

  describe('getCrispMessageOriginAnalytics', () => {
    it('should calculate message origin analytics', async () => {
      // Mock data for getMessagesInConversation
      mockWebsite.getMessagesInConversation.mockResolvedValue([
        { from: 'user', origin: 'chat' },
        { from: 'user', origin: 'email' },
        { from: 'operator', origin: 'chat' }, // This one shouldn't count as it's not from 'user'
        { from: 'user', origin: 'chat' },
      ]);

      const result = await service.getCrispMessageOriginAnalytics(['session1']);

      expect(mockWebsite.getMessagesInConversation).toHaveBeenCalledWith(
        crispWebsiteId,
        'session1',
      );

      // We expect 67% chat (2/3) and 33% email (1/3) from user messages
      expect(result).toContain('67%) chat widget origin');
      expect(result).toContain('33%) email origin');
    });

    it('should handle empty session list', async () => {
      const result = await service.getCrispMessageOriginAnalytics([]);
      expect(result).toContain('0%) chat widget origin');
      expect(result).toContain('0%) email origin');
    });

    it('should handle API errors when fetching messages', async () => {
      mockWebsite.getMessagesInConversation.mockRejectedValue(new Error('API Error'));
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await service.getCrispMessageOriginAnalytics(['session1']);

      expect(consoleSpy).toHaveBeenCalled();
      expect(result).toContain('0%) chat widget origin');
      expect(result).toContain('0%) email origin');

      consoleSpy.mockRestore();
    });

    it('should calculate correct percentages for multiple sessions', async () => {
      // Mock data for first session
      mockWebsite.getMessagesInConversation.mockImplementationOnce(() => {
        return Promise.resolve([
          { from: 'user', origin: 'chat' },
          { from: 'user', origin: 'chat' },
        ]);
      });

      // Mock data for second session
      mockWebsite.getMessagesInConversation.mockImplementationOnce(() => {
        return Promise.resolve([
          { from: 'user', origin: 'email' },
          { from: 'user', origin: 'email' },
        ]);
      });

      const result = await service.getCrispMessageOriginAnalytics(['session1', 'session2']);

      expect(mockWebsite.getMessagesInConversation).toHaveBeenCalledTimes(2);
      expect(result).toContain('50%) chat widget origin');
      expect(result).toContain('50%) email origin');
    });
  });
});
