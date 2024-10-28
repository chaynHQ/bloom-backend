import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import Crisp from 'crisp-api';
import { crispWebsiteId, EMAIL_REMINDERS_FREQUENCY } from 'src/utils/constants';
import { sendMailchimpUserEvent } from '../api/mailchimp/mailchimp-api';
import { EventLoggerService } from '../event-logger/event-logger.service';
import { EVENT_NAME } from './crisp.interface';
import { CrispService } from './crisp.service';
import { CrispEventDto } from './dtos/crisp.dto';

jest.mock('crisp-api', () => {
  return {
    website: {
      getConversationMetas: jest.fn(),
      addNewPeopleProfile: jest.fn(),
      getPeopleProfile: jest.fn(),
      updatePeopleProfile: jest.fn(),
      updatePeopleData: jest.fn(),
      removePeopleProfile: jest.fn(),
      listPeopleProfiles: jest.fn(),
    },
  };
});
jest.mock('../api/mailchimp/mailchimp-api');
jest.mock('../event-logger/event-logger.service');

const message: CrispEventDto = {
  website_id: 'test-website',
  session_id: 'test-session',
  content: 'Hi there',
  from: 'operator',
  timestamp: 1468413681043,
  fingerprint: 150912675256156,
  inbox_id: null,
  type: 'text',
  origin: 'chat',
  stamped: true,
  user: {
    nickname: 'Tester',
    email: 'tech@chayn.co',
    user_id: 'session_0839e4c2-a059-445b-8de5-390d6417f893',
  },
};

describe('CrispService', () => {
  let service: CrispService;
  let mockCrispClient: Crisp;
  let mockSendMailchimp: jest.Mock;
  let mockEventLogger: jest.Mock;
  let mockLogger: Logger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrispService,
        { provide: EventLoggerService, useValue: {} },
        { provide: Logger, useValue: {} },
      ],
    }).compile();

    service = module.get<CrispService>(CrispService);
    // @ts-expect-error mocking crisp
    mockCrispClient = module.get<CrispClient>(Crisp);
    mockSendMailchimp = jest.mocked(sendMailchimpUserEvent);
    mockEventLogger = jest.mocked(
      module.get<EventLoggerService>(EventLoggerService).createEventLog,
    );
    mockLogger = module.get<Logger>(Logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleCrispEvent', () => {
    it('should handle CHAT_MESSAGE_RECEIVED event', async () => {
      const eventName = EVENT_NAME.CHAT_MESSAGE_RECEIVED;
      const mockSessionMetaData = { email: 'test@email.com' };

      mockCrispClient.website.getConversationMetas.mockResolvedValueOnce(mockSessionMetaData);

      await service.handleCrispEvent(message, eventName);

      expect(mockCrispClient.website.getConversationMetas).toHaveBeenCalledWith(
        message.website_id,
        message.session_id,
      );
      expect(mockEventLogger).toHaveBeenCalledWith({
        email: 'test@email.com',
        event: eventName,
        date: expect.any(Date),
      });
      expect(mockSendMailchimp).toHaveBeenCalledWith('test@email.com', 'CRISP_MESSAGE_RECEIVED');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Crisp service: CRISP_MESSAGE_RECEIVED event sent to mailchimp',
      );
    });

    it('should throw error on Crisp API errors', async () => {
      const eventName = EVENT_NAME.CHAT_MESSAGE_RECEIVED;
      mockCrispClient.website.getConversationMetas.mockRejectedValueOnce(new Error('Test Error'));

      await expect(service.handleCrispEvent(message, eventName)).rejects.toThrowError(
        'Failed to handle crisp event for CHAT_MESSAGE_RECEIVED: Test Error',
      );
    });

    it('should throw error on other errors', async () => {
      const eventName = EVENT_NAME.CHAT_MESSAGE_RECEIVED;
      mockEventLogger.mockRejectedValueOnce(new Error('Test Error'));

      await expect(service.handleCrispEvent(message, eventName)).rejects.toThrowError(
        'Failed to handle crisp event for CHAT_MESSAGE_RECEIVED: Test Error',
      );
    });
  });
  describe('createCrispProfile', () => {
    it('should create a new Crisp profile', async () => {
      const newPeopleProfile = { email: 'test@email.com', first_name: 'Test' };
      const mockCrispProfileResponse = { id: '12345' };

      mockCrispClient.website.addNewPeopleProfile.mockResolvedValueOnce(mockCrispProfileResponse);

      const result = await service.createCrispProfile(newPeopleProfile);

      expect(result).toEqual(mockCrispProfileResponse);
      expect(mockCrispClient.website.addNewPeopleProfile).toHaveBeenCalledWith(
        crispWebsiteId,
        newPeopleProfile,
      );
    });

    it('should throw error on API failure', async () => {
      const newPeopleProfile = { email: 'test@email.com', first_name: 'Test' };
      mockCrispClient.website.addNewPeopleProfile.mockRejectedValueOnce(new Error('Test Error'));

      await expect(service.createCrispProfile(newPeopleProfile)).rejects.toThrowError(
        'Create crisp profile API call failed: Test Error',
      );
    });
  });

  describe('getCrispProfile', () => {
    it('should get a Crisp profile', async () => {
      const email = 'test@email.com';
      const mockCrispProfileResponse = { id: '12345' };

      mockCrispClient.website.getPeopleProfile.mockResolvedValueOnce(mockCrispProfileResponse);

      const result = await service.getCrispProfile(email);

      expect(result).toEqual(mockCrispProfileResponse);
      expect(mockCrispClient.website.getPeopleProfile).toHaveBeenCalledWith(crispWebsiteId, email);
    });

    it('should throw error on API failure', async () => {
      const email = 'test@email.com';
      mockCrispClient.website.getPeopleProfile.mockRejectedValueOnce(new Error('Test Error'));

      await expect(service.getCrispProfile(email)).rejects.toThrowError(
        'Get crisp profile base API call failed: Test Error',
      );
    });
  });
  describe('getCrispPeopleData', () => {
    it('should get Crisp people data', async () => {
      const email = 'test@email.com';
      const mockCrispPeopleData = { custom_fields: { key1: 'value1' } };

      mockCrispClient.website.getPeopleData.mockResolvedValueOnce(mockCrispPeopleData);

      const result = await service.getCrispPeopleData(email);

      expect(result).toEqual(mockCrispPeopleData);
      expect(mockCrispClient.website.getPeopleData).toHaveBeenCalledWith(crispWebsiteId, email);
    });

    it('should throw error on API failure', async () => {
      const email = 'test@email.com';
      mockCrispClient.website.getPeopleData.mockRejectedValueOnce(new Error('Test Error'));

      await expect(service.getCrispPeopleData(email)).rejects.toThrowError(
        'Get crisp profile API call failed: Test Error',
      );
    });
  });

  describe('updateCrispProfileBase', () => {
    it('should update Crisp profile base data', async () => {
      const email = 'test@email.com';
      const peopleProfile = { person: { nickname: 'Updated Name' } };
      const mockCrispProfileResponse = { id: '12345' };

      mockCrispClient.website.updatePeopleProfile.mockResolvedValueOnce(mockCrispProfileResponse);

      const result = await service.updateCrispProfileBase(peopleProfile, email);

      expect(result).toEqual(mockCrispProfileResponse);
      expect(mockCrispClient.website.updatePeopleProfile).toHaveBeenCalledWith(
        crispWebsiteId,
        email,
        peopleProfile,
      );
    });

    it('should throw error on API failure', async () => {
      const email = 'test@email.com';
      const peopleProfile = { person: { nickname: 'Updated Name' } };
      mockCrispClient.website.updatePeopleProfile.mockRejectedValueOnce(new Error('Test Error'));

      await expect(service.updateCrispProfileBase(peopleProfile, email)).rejects.toThrowError(
        'Update crisp profile base API call failed: Test Error',
      );
    });
  });

  describe('updateCrispPeopleData', () => {
    it('should update Crisp people data', async () => {
      const email = 'test@email.com';
      const peopleData = { email_reminders_frequency: EMAIL_REMINDERS_FREQUENCY.TWO_WEEKS };
      const mockCrispPeopleData = { data: { data: peopleData } }; // Merged data

      mockCrispClient.website.updatePeopleData.mockResolvedValueOnce(mockCrispPeopleData);

      const result = await service.updateCrispPeopleData(peopleData, email);

      expect(result).toEqual(mockCrispPeopleData);
      expect(mockCrispClient.website.updatePeopleData).toHaveBeenCalledWith(
        crispWebsiteId,
        email,
        peopleData,
      );
    });

    it('should throw error on API failure', async () => {
      const email = 'test@email.com';
      const peopleData = { email_reminders_frequency: EMAIL_REMINDERS_FREQUENCY.TWO_WEEKS };
      mockCrispClient.website.updatePeopleData.mockRejectedValueOnce(new Error('Test Error'));

      await expect(service.updateCrispPeopleData(peopleData, email)).rejects.toThrowError(
        'Update crisp profile API call failed: Test Error',
      );
    });
  });

  describe('deleteCrispProfile', () => {
    it('should delete a Crisp profile', async () => {
      const email = 'test@email.com';

      mockCrispClient.website.removePeopleProfile.mockResolvedValueOnce();

      await service.deleteCrispProfile(email);

      expect(mockCrispClient.website.removePeopleProfile).toHaveBeenCalledWith(
        crispWebsiteId,
        email,
      );
    });

    it('should throw error on API failure', async () => {
      const email = 'test@email.com';
      mockCrispClient.website.removePeopleProfile.mockRejectedValueOnce(new Error('Test Error'));

      await expect(service.deleteCrispProfile(email)).rejects.toThrowError(
        'Delete crisp profile API call failed: Test Error',
      );
    });
  });

  describe('deleteCypressCrispProfiles', () => {
    it('should delete Cypress test profiles', async () => {
      const mockProfiles = {
        data: {
          data: [
            { email: 'cypresstestemail1@example.com' },
            { email: 'cypresstestemail2@example.com' },
          ],
        },
      };

      mockCrispClient.website.listPeopleProfiles.mockResolvedValueOnce(mockProfiles);

      await service.deleteCypressCrispProfiles();

      expect(mockCrispClient.website.listPeopleProfiles).toHaveBeenCalledWith(
        crispWebsiteId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'cypresstestemail+',
      );
      expect(mockCrispClient.website.removePeopleProfile).toHaveBeenCalledTimes(2);
    });

    it('should handle API failure', async () => {
      mockCrispClient.website.listPeopleProfiles.mockRejectedValueOnce(new Error('Test Error'));

      await expect(service.deleteCypressCrispProfiles()).rejects.toThrowError(
        'Delete cypress crisp profiles API call failed: Test Error',
      );
    });
  });
});
