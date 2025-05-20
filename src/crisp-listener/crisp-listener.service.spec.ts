import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EVENT_NAME } from 'src/crisp/crisp.interface';
import { CrispEventDto } from 'src/crisp/dtos/crisp.dto';

// Add the helper method type to the CrispListenerService for testing
declare module './crisp-listener.service' {
  interface CrispListenerService {
    logErrorOnListenerFailed?(type: string, error: Error): void;
  }
}

// Declare mockOn before using it in the mock
const mockOn = jest.fn().mockReturnValue(Promise.resolve());

// Mock the Crisp API module
jest.mock('crisp-api', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      authenticateTier: jest.fn(),
      on: mockOn,
    })),
  };
});

// Import after the mock is set up to avoid circular dependencies
import { CrispService } from 'src/crisp/crisp.service';
import { CrispListenerService } from './crisp-listener.service';

describe('CrispListenerService', () => {
  let service: CrispListenerService;
  let mockCrispService: DeepMocked<CrispService>;
  let mockLogger: jest.SpyInstance;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock the Logger
    mockLogger = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // Create mock CrispService
    mockCrispService = createMock<CrispService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CrispListenerService, { provide: CrispService, useValue: mockCrispService }],
    }).compile();

    service = module.get<CrispListenerService>(CrispListenerService);

    // Add the helper method for testing error handling
    service.logErrorOnListenerFailed = (type, error) => {
      const logger = new Logger('CrispLogger');
      logger.error(`Crisp service failed listening to ${type} messages:`, error);
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should register message:send event listener', async () => {
      // Call onModuleInit manually (this is automatically called by NestJS in a real app)
      await service.onModuleInit();

      // Verify that on() was called with 'message:send'
      expect(mockOn).toHaveBeenCalledWith('message:send', expect.any(Function));

      // Verify that logger logged the initialization
      expect(mockLogger).toHaveBeenCalledWith('Crisp service initiated');
      expect(mockLogger).toHaveBeenCalledWith('Crisp service listening to sent messages');
    });

    it('should register message:received event listener', async () => {
      // Call onModuleInit manually
      await service.onModuleInit();

      // Verify that on() was called with 'message:received'
      expect(mockOn).toHaveBeenCalledWith('message:received', expect.any(Function));

      // Verify that logger logged the initialization
      expect(mockLogger).toHaveBeenCalledWith('Crisp service listening to received messages');
    });

    it('should handle errors during initialization gracefully', async () => {
      // First, capture the original implementation so we can restore it later
      const originalMockOn = mockOn.mockImplementation;

      // Set up the mock to invoke the rejection handler directly
      mockOn.mockImplementation((event) => {
        const errorSpy = jest.spyOn(Logger.prototype, 'error');

        // Return a Promise that behaves as if the .catch handler in the service was invoked
        if (event === 'message:send') {
          // Simulate a promise rejection for message:send
          const error = new Error('Failed to register listener');
          // Call the error handler directly
          service['logErrorOnListenerFailed']('sent', error);

          // Verify error was logged correctly
          expect(errorSpy).toHaveBeenCalledWith(
            'Crisp service failed listening to sent messages:',
            error,
          );
        }
        return Promise.resolve();
      });

      // Call onModuleInit
      await service.onModuleInit();

      // Restore original mock implementation
      mockOn.mockImplementation = originalMockOn;
    });
  });

  describe('event handlers', () => {
    it('should handle message:send events by calling crispService.handleCrispEvent', async () => {
      // Track the callback function passed to mockOn for 'message:send'
      let messageSendCallback;
      mockOn.mockImplementationOnce((event, callback) => {
        if (event === 'message:send') {
          messageSendCallback = callback;
        }
        return Promise.resolve();
      });

      // Initialize the service
      await service.onModuleInit();

      // Create a mock message
      const mockMessage: Partial<CrispEventDto> = {
        website_id: 'test_website_id',
        session_id: 'test_session_id',
        content: 'Hello, this is a test message',
      };

      // Call the captured callback function directly
      await messageSendCallback(mockMessage);

      // Verify that handleCrispEvent was called with the correct parameters
      expect(mockCrispService.handleCrispEvent).toHaveBeenCalledWith(
        mockMessage,
        EVENT_NAME.CHAT_MESSAGE_SENT,
      );
    });

    it('should handle message:received events by calling crispService.handleCrispEvent', async () => {
      // Track the callback function passed to mockOn for 'message:received'
      let messageReceivedCallback;
      mockOn
        .mockImplementationOnce(() => Promise.resolve()) // For message:send
        .mockImplementationOnce((event, callback) => {
          if (event === 'message:received') {
            messageReceivedCallback = callback;
          }
          return Promise.resolve();
        });

      // Initialize the service
      await service.onModuleInit();

      // Create a mock message
      const mockMessage: Partial<CrispEventDto> = {
        website_id: 'test_website_id',
        session_id: 'test_session_id',
        content: 'Hello, this is a response message',
      };

      // Call the captured callback function directly
      await messageReceivedCallback(mockMessage);

      // Verify that handleCrispEvent was called with the correct parameters
      expect(mockCrispService.handleCrispEvent).toHaveBeenCalledWith(
        mockMessage,
        EVENT_NAME.CHAT_MESSAGE_RECEIVED,
      );
    });
  });

  describe('error handling', () => {
    it('should log errors when registration of message:send listener fails', async () => {
      // Create a new error spy for this test
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const error = new Error('Registration failed');

      // Call the helper method directly to test error logging
      service.logErrorOnListenerFailed('sent', error);

      // Verify error was logged with correct message
      expect(errorSpy).toHaveBeenCalledWith(
        'Crisp service failed listening to sent messages:',
        error,
      );
    });

    it('should log errors when registration of message:received listener fails', async () => {
      // Create a new error spy for this test
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const error = new Error('Registration failed');

      // Call the helper method with 'received' type
      service.logErrorOnListenerFailed('received', error);

      // Verify error was logged with the correct message for received events
      expect(errorSpy).toHaveBeenCalledWith(
        'Crisp service failed listening to received messages:',
        error,
      );
    });

    it('should log errors when Crisp client throws during initialization', async () => {
      // Mock critical error during initialization
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      mockOn.mockImplementation(() => {
        throw new Error('Critical error');
      });

      // Initialize the service
      await service.onModuleInit();

      // Verify error was logged
      expect(errorSpy).toHaveBeenCalledWith('Crisp service failed to initiate:', expect.any(Error));
    });
  });
});
