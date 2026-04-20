import { createMock } from '@golevelup/ts-jest';
import { Ga4DataClient } from 'src/api/ga4/ga4-data.client';
import { Ga4RunReportResponse } from 'src/api/ga4/ga4.types';
import { Ga4MetricsService } from './ga4-metrics.service';
import { BREAKDOWNS } from './reporting.events';
import { ReportWindow } from './reporting.types';

const dailyWindow: ReportWindow = {
  from: new Date('2026-04-19T23:00:00.000Z'),
  to: new Date('2026-04-20T22:59:59.999Z'),
  label: '2026-04-20',
  timezone: 'Europe/London',
};

const overviewResp = (): Ga4RunReportResponse => ({
  rows: [
    { metricValues: [{ value: '1234' }, { value: '210' }, { value: '1890' }, { value: '4212' }, { value: '123.4' }] },
  ],
});
const eventsResp = (): Ga4RunReportResponse => ({
  rows: [
    { dimensionValues: [{ value: 'LOGIN_SUCCESS' }], metricValues: [{ value: '42' }, { value: '38' }] },
  ],
});
const breakdownResp = (): Ga4RunReportResponse => ({
  rows: [{ dimensionValues: [{ value: '/courses' }], metricValues: [{ value: '500' }, { value: '200' }] }],
});

describe('Ga4MetricsService', () => {
  let dataClient: jest.Mocked<Ga4DataClient>;
  let service: Ga4MetricsService;
  beforeEach(() => {
    dataClient = createMock<Ga4DataClient>();
    service = new Ga4MetricsService(dataClient);
  });

  it('weekly collect runs overview + events via runReport and breakdowns via batchRunReports', async () => {
    dataClient.runReport.mockImplementation(async (req) => {
      const dimName = req.dimensions?.[0]?.name;
      if (!dimName) return overviewResp();
      if (dimName === 'eventName') return eventsResp();
      return breakdownResp();
    });
    dataClient.batchRunReports.mockImplementation(async (requests) => requests.map(() => breakdownResp()));

    const metrics = await service.collect(dailyWindow, 'weekly');
    expect(metrics.overview).toMatchObject({ activeUsers: 1234 });
    expect(metrics.events).toHaveLength(1);
    expect(metrics.breakdowns).toHaveLength(BREAKDOWNS.length);
    expect(metrics.eventBreakdowns.length).toBeGreaterThan(0);
    // Breakdowns + event breakdowns go through batchRunReports.
    expect(dataClient.batchRunReports).toHaveBeenCalled();
  });

  it('daily collect skips global + event-line breakdowns to stay headline-only', async () => {
    dataClient.runReport.mockImplementation(async (req) => {
      const dimName = req.dimensions?.[0]?.name;
      if (!dimName) return overviewResp();
      return eventsResp();
    });

    const metrics = await service.collect(dailyWindow, 'daily');
    expect(metrics.breakdowns).toEqual([]);
    expect(metrics.eventBreakdowns).toEqual([]);
    expect(dataClient.batchRunReports).not.toHaveBeenCalled();
  });
});
