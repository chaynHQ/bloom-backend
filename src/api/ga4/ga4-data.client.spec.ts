jest.mock('src/api/apiCalls', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('src/utils/constants', () => ({ ga4PropertyId: '987654321' }));

import apiCall from 'src/api/apiCalls';
import { Ga4AuthService } from './ga4-auth';
import { Ga4DataClient } from './ga4-data.client';

const apiCallMock = apiCall as unknown as jest.Mock;

describe('Ga4DataClient', () => {
  it('posts runReport and batchRunReports to the Data API with bearer auth', async () => {
    apiCallMock.mockReset();
    const auth = {
      getAccessToken: jest.fn().mockResolvedValue('tkn'),
    } as unknown as jest.Mocked<Ga4AuthService>;
    const client = new Ga4DataClient(auth);

    // runReport.
    apiCallMock.mockResolvedValueOnce({ data: { rowCount: 3 } });
    const reportResult = await client.runReport({
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dateRanges: [{ startDate: '2026-04-20', endDate: '2026-04-20' }],
    });
    expect(reportResult).toEqual({ rowCount: 3 });
    expect(apiCallMock).toHaveBeenLastCalledWith({
      url: 'https://analyticsdata.googleapis.com/v1beta/properties/987654321:runReport',
      type: 'post',
      data: expect.objectContaining({ dimensions: [{ name: 'eventName' }] }),
      headers: { Authorization: 'Bearer tkn', 'Content-Type': 'application/json' },
    });

    // batchRunReports.
    apiCallMock.mockResolvedValueOnce({ data: { reports: [{ rowCount: 1 }, { rowCount: 2 }] } });
    const batchResult = await client.batchRunReports([
      { metrics: [{ name: 'eventCount' }], dateRanges: [{ startDate: '2026-04-20', endDate: '2026-04-20' }] },
      { metrics: [{ name: 'totalUsers' }], dateRanges: [{ startDate: '2026-04-20', endDate: '2026-04-20' }] },
    ]);
    expect(batchResult).toEqual([{ rowCount: 1 }, { rowCount: 2 }]);
    expect(apiCallMock).toHaveBeenLastCalledWith({
      url: 'https://analyticsdata.googleapis.com/v1beta/properties/987654321:batchRunReports',
      type: 'post',
      data: expect.objectContaining({ requests: expect.any(Array) }),
      headers: { Authorization: 'Bearer tkn', 'Content-Type': 'application/json' },
    });
  });
});
