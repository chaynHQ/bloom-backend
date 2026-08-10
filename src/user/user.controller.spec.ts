import { HttpException } from '@nestjs/common';
import { UserController } from './user.controller';

describe('UserController', () => {
  let controller: UserController;
  let serviceUserProfilesService: {
    getFrontContactBackfillStatus: jest.Mock;
    countFrontContactBackfillUsers: jest.Mock;
    validateFrontContactBackfillOptions: jest.Mock;
    isFrontContactBackfillRunning: jest.Mock;
    startFrontContactBackfill: jest.Mock;
  };

  beforeEach(() => {
    serviceUserProfilesService = {
      getFrontContactBackfillStatus: jest.fn().mockReturnValue({ status: 'idle' }),
      countFrontContactBackfillUsers: jest
        .fn()
        .mockResolvedValue({ total: 1200, since: '2025-11-01T00:00:00.000Z' }),
      validateFrontContactBackfillOptions: jest.fn(),
      isFrontContactBackfillRunning: jest.fn().mockReturnValue(false),
      startFrontContactBackfill: jest.fn(),
    };
    controller = new UserController({} as never, serviceUserProfilesService as never);
  });

  describe('front contact backfill', () => {
    it('reports how many contacts a run would cover while idle', async () => {
      await expect(controller.getFrontContactBackfillStatus()).resolves.toEqual({
        status: 'idle',
        coverage: { total: 1200, since: '2025-11-01T00:00:00.000Z' },
      });
    });

    it('reuses the in-flight totals while running, instead of re-counting every poll', async () => {
      serviceUserProfilesService.getFrontContactBackfillStatus.mockReturnValue({
        status: 'running',
        progress: { total: 1200, processed: 40, since: '2025-11-01T00:00:00.000Z' },
        errors: [],
      });

      const status = await controller.getFrontContactBackfillStatus();

      expect(serviceUserProfilesService.countFrontContactBackfillUsers).not.toHaveBeenCalled();
      expect(status.coverage).toEqual({
        total: 1200,
        since: '2025-11-01T00:00:00.000Z',
        until: undefined,
      });
    });

    it('re-counts once a run has finished, so the next run is sized correctly', async () => {
      serviceUserProfilesService.getFrontContactBackfillStatus.mockReturnValue({
        status: 'completed',
        progress: { total: 1200, processed: 1200, since: '2025-11-01T00:00:00.000Z' },
        errors: [],
      });

      await controller.getFrontContactBackfillStatus();

      expect(serviceUserProfilesService.countFrontContactBackfillUsers).toHaveBeenCalled();
    });

    it('starts the backfill in the background and returns immediately', async () => {
      await expect(controller.startFrontContactBackfill({})).resolves.toEqual({
        status: 'started',
      });
      expect(serviceUserProfilesService.startFrontContactBackfill).toHaveBeenCalledWith({});
    });

    it('validates the window before detaching the run', async () => {
      serviceUserProfilesService.validateFrontContactBackfillOptions.mockImplementation(() => {
        throw new HttpException('Invalid startDate: nope', 400);
      });

      await expect(controller.startFrontContactBackfill({ startDate: 'nope' })).rejects.toThrow(
        'Invalid startDate',
      );
      expect(serviceUserProfilesService.startFrontContactBackfill).not.toHaveBeenCalled();
    });

    it('rejects a second run while one is in progress', async () => {
      serviceUserProfilesService.isFrontContactBackfillRunning.mockReturnValue(true);

      await expect(controller.startFrontContactBackfill({})).rejects.toThrow('already in progress');
      expect(serviceUserProfilesService.startFrontContactBackfill).not.toHaveBeenCalled();
    });
  });
});
