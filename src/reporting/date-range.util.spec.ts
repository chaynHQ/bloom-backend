import { computeRange } from './date-range.util';

describe('computeRange', () => {
  it('computes daily and weekly windows in the configured TZ, surviving DST + ISO-week-year boundary', () => {
    // Daily: previous-day, TZ-local date label, UTC bounds spanning a full
    // local day (DST-aware via Luxon).
    const daily = computeRange('daily', new Date('2026-04-21T09:00:00+01:00'), 'Europe/London');
    expect(daily.label).toBe('2026-04-20');
    expect(daily.from.toISOString()).toBe('2026-04-19T23:00:00.000Z');
    expect(daily.to.toISOString()).toBe('2026-04-20T22:59:59.999Z');

    // Weekly: previous ISO week. 2024-12-30 (Monday) starts ISO week 2025-W01
    // — label must reflect ISO-week year, not calendar year.
    const weekly = computeRange('weekly', new Date('2025-01-06T09:00:00Z'), 'UTC');
    expect(weekly.label).toBe('2025-W01');
    expect(weekly.from.toISOString()).toBe('2024-12-30T00:00:00.000Z');
    expect(weekly.to.toISOString()).toBe('2025-01-05T23:59:59.999Z');
  });

  it('computes monthly and quarterly windows, and throws on unknown timezone', () => {
    const monthly = computeRange(
      'monthly',
      new Date('2026-05-01T09:00:00+01:00'),
      'Europe/London',
    );
    expect(monthly.label).toBe('2026-04');
    expect(monthly.from.toISOString()).toBe('2026-03-31T23:00:00.000Z');
    expect(monthly.to.toISOString()).toBe('2026-04-30T22:59:59.999Z');

    const quarterly = computeRange(
      'quarterly',
      new Date('2026-04-01T09:00:00+01:00'),
      'Europe/London',
    );
    expect(quarterly.label).toBe('2026-Q1');
    expect(quarterly.from.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(quarterly.to.toISOString()).toBe('2026-03-31T22:59:59.999Z');

    expect(() => computeRange('daily', new Date(), 'Not/A/Zone')).toThrow(/Invalid timezone/);
  });
});
