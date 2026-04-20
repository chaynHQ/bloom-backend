import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { Ga4DataClient } from 'src/api/ga4/ga4-data.client';
import { Ga4RunReportRequest, Ga4RunReportResponse } from 'src/api/ga4/ga4.types';
import { Logger } from 'src/logger/logger';
import { BREAKDOWNS, EVENT_GROUPS, EventLine } from './reporting.events';
import {
  Ga4Breakdown,
  Ga4EventBreakdown,
  Ga4EventTotal,
  Ga4Metrics,
  Ga4OverviewMetrics,
  PERIODS_WITH_FULL_DETAIL,
  ReportPeriod,
  ReportWindow,
} from './reporting.types';

interface GaDateRange {
  startDate: string;
  endDate: string;
}

// GA4 batchRunReports accepts up to 5 reports per HTTP call.
const GA4_BATCH_SIZE = 5;

@Injectable()
export class Ga4MetricsService {
  private readonly logger = new Logger('Ga4MetricsService');

  constructor(private readonly dataClient: Ga4DataClient) {}

  async collect(window: ReportWindow, period: ReportPeriod): Promise<Ga4Metrics> {
    const range = this.toDataApiDateRange(window);
    const wantDetail = PERIODS_WITH_FULL_DETAIL.includes(period);

    // Daily digest is headline-only — skip the ~15 extra GA4 calls that power
    // the global breakdowns and per-line `↳ by X` sub-lines.
    const [overview, events, breakdowns, eventBreakdowns] = await Promise.all([
      this.fetchOverview(range),
      this.fetchEvents(range),
      wantDetail ? this.fetchBreakdowns(range) : Promise.resolve([]),
      wantDetail ? this.fetchEventBreakdowns(range) : Promise.resolve([]),
    ]);

    return { overview, events, breakdowns, eventBreakdowns };
  }

  private toDataApiDateRange(window: ReportWindow): GaDateRange {
    // GA4 Data API date strings are in the property's timezone. Convert our
    // UTC window bounds back to the configured TZ before formatting —
    // otherwise a Monday 00:00 London window gets emitted as the prior
    // Sunday's UTC date.
    const fmt = (d: Date) =>
      DateTime.fromJSDate(d, { zone: window.timezone }).toFormat('yyyy-LL-dd');
    return { startDate: fmt(window.from), endDate: fmt(window.to) };
  }

  private async fetchOverview(
    range: GaDateRange,
  ): Promise<Ga4OverviewMetrics | { unavailable: true; reason: string }> {
    try {
      const resp = await this.dataClient.runReport({
        metrics: [
          { name: 'activeUsers' },
          { name: 'newUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
        ],
        dateRanges: [range],
      });
      const values = resp.rows?.[0]?.metricValues ?? [];
      return {
        activeUsers: Number(values[0]?.value ?? 0),
        newUsers: Number(values[1]?.value ?? 0),
        sessions: Number(values[2]?.value ?? 0),
        screenPageViews: Number(values[3]?.value ?? 0),
        averageSessionDuration: Number(values[4]?.value ?? 0),
      };
    } catch (err) {
      const reason = err?.message || 'unknown error';
      this.logger.warn(`GA4 overview fetch failed: ${reason}`);
      return { unavailable: true, reason };
    }
  }

  private async fetchEvents(
    range: GaDateRange,
  ): Promise<Ga4EventTotal[] | { unavailable: true; reason: string }> {
    try {
      const resp = await this.dataClient.runReport({
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
        dateRanges: [range],
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      });
      return (resp.rows ?? []).map((row) => ({
        eventName: row.dimensionValues?.[0]?.value ?? '(unknown)',
        eventCount: Number(row.metricValues?.[0]?.value ?? 0),
        totalUsers: Number(row.metricValues?.[1]?.value ?? 0),
      }));
    } catch (err) {
      const reason = err?.message || 'unknown error';
      this.logger.warn(`GA4 events fetch failed: ${reason}`);
      return { unavailable: true, reason };
    }
  }

  private async fetchBreakdowns(range: GaDateRange): Promise<Ga4Breakdown[]> {
    const requests: Ga4RunReportRequest[] = BREAKDOWNS.map((spec) => ({
      dimensions: [{ name: spec.apiName }],
      metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
      dateRanges: [range],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 5,
    }));

    const responses = await this.runInBatches(requests, (i) => `breakdown[${BREAKDOWNS[i].apiName}]`);

    return BREAKDOWNS.map((spec, i): Ga4Breakdown | null => {
      const resp = responses[i];
      if (!resp) return null;
      return { apiName: spec.apiName, displayName: spec.displayName, rows: this.parseRows(resp) };
    }).filter((b): b is Ga4Breakdown => b !== null);
  }

  /**
   * For every EVENT_GROUPS line with a `breakdownParam`, run one filtered
   * report: "top 3 <param> values across [this line's events]". Batched via
   * GA4 batchRunReports (up to 5 per HTTP call) to stay well under the
   * per-property concurrency limit. Fails soft per line.
   */
  private async fetchEventBreakdowns(range: GaDateRange): Promise<Ga4EventBreakdown[]> {
    const lines: EventLine[] = EVENT_GROUPS.flatMap((g) => g.lines).filter(
      (line): line is EventLine & { breakdownParam: string; paramLabel: string } =>
        Boolean(line.breakdownParam && line.paramLabel),
    );

    const requests: Ga4RunReportRequest[] = lines.map((line) => ({
      dimensions: [{ name: line.breakdownParam as string }],
      metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
      dateRanges: [range],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 3,
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          inListFilter: { values: line.items.map((i) => i.event) },
        },
      },
    }));

    const responses = await this.runInBatches(requests, (i) => `eventBreakdown[${lines[i].label}]`);

    return lines
      .map((line, i): Ga4EventBreakdown | null => {
        const resp = responses[i];
        if (!resp) return null;
        const rows = this.parseRows(resp);
        if (rows.length === 0) return null;
        return {
          lineLabel: line.label,
          paramApiName: line.breakdownParam as string,
          paramLabel: line.paramLabel as string,
          rows,
        };
      })
      .filter((b): b is Ga4EventBreakdown => b !== null);
  }

  /**
   * Runs N runReport requests via GA4 batchRunReports (5 per HTTP call). If a
   * batch fails validation (one bad request sinks the whole batch — typically
   * an unregistered custom dimension), fall back to individual runReport calls
   * for that batch so the remaining requests still succeed. Returns responses
   * aligned 1:1 with the input array; failed individual requests are null.
   */
  private async runInBatches(
    requests: Ga4RunReportRequest[],
    describe: (index: number) => string,
  ): Promise<Array<Ga4RunReportResponse | null>> {
    if (requests.length === 0) return [];

    const batches: Array<{ offset: number; reqs: Ga4RunReportRequest[] }> = [];
    for (let i = 0; i < requests.length; i += GA4_BATCH_SIZE) {
      batches.push({ offset: i, reqs: requests.slice(i, i + GA4_BATCH_SIZE) });
    }

    const batchResults = await Promise.all(
      batches.map(async ({ offset, reqs }) => {
        try {
          const reports = await this.dataClient.batchRunReports(reqs);
          return reports.map((r) => r ?? null);
        } catch (err) {
          this.logger.warn(
            `GA4 batchRunReports failed (offset ${offset}); falling back to individual calls: ${err?.message || 'unknown error'}`,
          );
          return Promise.all(
            reqs.map((req, j) => this.runSingleSafe(req, describe(offset + j))),
          );
        }
      }),
    );

    return batchResults.flat();
  }

  private async runSingleSafe(
    request: Ga4RunReportRequest,
    label: string,
  ): Promise<Ga4RunReportResponse | null> {
    try {
      return await this.dataClient.runReport(request);
    } catch (err) {
      this.logger.warn(`GA4 ${label} failed: ${err?.message || 'unknown error'}`);
      return null;
    }
  }

  private parseRows(resp: Ga4RunReportResponse) {
    return (resp.rows ?? []).map((row) => ({
      value: row.dimensionValues?.[0]?.value ?? '(unknown)',
      eventCount: Number(row.metricValues?.[0]?.value ?? 0),
      totalUsers: Number(row.metricValues?.[1]?.value ?? 0),
    }));
  }
}
