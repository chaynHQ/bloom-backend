import { Test, TestingModule } from '@nestjs/testing';
import { Crisp } from 'crisp-api';
import { CrispService } from 'src/crisp/crisp.service';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { CrispListenerService } from './crisp-listener.service';

jest.mock('crisp-api', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    authenticateTier: jest.fn(),
  }));
});

describe('CrispListenerService', () => {
  let service: CrispListenerService;
  let crispService: CrispService;
  let crispClient: Crisp; // Declare crispClient as a Crisp type

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrispListenerService,
        CrispService,
        { provide: EventLoggerService, useValue: {} },
        { provide: Crisp, useValue: {} },
      ],
    }).compile();

    service = module.get<CrispListenerService>(CrispListenerService);
    crispService = module.get<CrispService>(CrispService);
    crispClient = module.get<Crisp>(Crisp); // Get CrispClient from the module
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should set up Crisp event listeners', async () => {
    // Call onModuleInit
    await service.onModuleInit();

    // Mock CrispClient methods
    const onSpy = jest.spyOn(crispClient, 'on');

    // Assertions
    expect(onSpy).toHaveBeenCalledTimes(2); // 'message:send' and 'message:received'
    expect(crispService.handleCrispEvent).not.toHaveBeenCalled(); // Ensure handleCrispEvent is not called before events
  });

  it('should handle Crisp events', async () => {
    // Call onModuleInit
    await service.onModuleInit();

    // Mock CrispClient methods
    const onSpy = jest.spyOn(crispClient, 'on');
    onSpy.mockImplementation((event, callback) => {
      return callback({ message: 'Test message' });
    });

    // Mock handleCrispEvent
    crispService.handleCrispEvent = jest.fn();

    // Assertions
    expect(crispService.handleCrispEvent).toHaveBeenCalledWith(
      { message: 'Test message' },
      'CHAT_MESSAGE_SENT',
    );
    expect(crispService.handleCrispEvent).toHaveBeenCalledWith(
      { message: 'Test message' },
      'CHAT_MESSAGE_RECEIVED',
    );
  });

  it('should handle errors gracefully', async () => {
    // Mock CrispClient methods to throw errors
    const onSpy = jest.spyOn(crispClient, 'on');
    onSpy.mockImplementation((event, callback) => {
      return callback(new Error('Test error'));
    });

    // Call onModuleInit
    await service.onModuleInit();

    // Assertions
    // expect(logger.error).toHaveBeenCalledTimes(2); // Two error messages should be logged
  });
});
