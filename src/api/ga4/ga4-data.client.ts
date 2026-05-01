import { Injectable } from '@nestjs/common';
import apiCall from 'src/api/apiCalls';
import { ga4PropertyId } from 'src/utils/constants';
import { Ga4AuthService } from './ga4-auth';
import { Ga4RunReportRequest, Ga4RunReportResponse } from './ga4.types';

const DATA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta';

@Injectable()
export class Ga4DataClient {
  constructor(private readonly auth: Ga4AuthService) {}

  async runReport(request: Ga4RunReportRequest): Promise<Ga4RunReportResponse> {
    const token = await this.auth.getAccessToken();
    const response = await apiCall({
      url: `${DATA_API_BASE}/properties/${ga4PropertyId}:runReport`,
      type: 'post',
      data: request,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    return response.data as Ga4RunReportResponse;
  }

  async batchRunReports(requests: Ga4RunReportRequest[]): Promise<Ga4RunReportResponse[]> {
    const token = await this.auth.getAccessToken();
    const response = await apiCall({
      url: `${DATA_API_BASE}/properties/${ga4PropertyId}:batchRunReports`,
      type: 'post',
      data: { requests },
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const body = response.data as { reports?: Ga4RunReportResponse[] };
    return body.reports ?? [];
  }
}
