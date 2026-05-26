import { computeRange } from './date-range.util';

describe('computeRange', () => {
  it('computes the prior period window in the configured TZ for each cadence, and throws on invalid TZ', () => {
    // Daily — previous-day TZ-local date, UTC bounds spanning a full local day.
    const daily = computeRange('daily', new Date('2026-04-21T09:00:00+01:00'), 'Europe/London');
    expect(daily).toMatchObject({
      label: '2026-04-20',
      from: new Date('2026-04-19T23:00:00.000Z'),
      to: new Date('2026-04-20T22:59:59.999Z'),
    });

    // Weekly — ISO-week label must reflect ISO-week year (2024-12-30 → 2025-W01).
    const weekly = computeRange('weekly', new Date('2025-01-06T09:00:00Z'), 'UTC');
    expect(weekly).toMatchObject({
      label: '2025-W01',
      from: new Date('2024-12-30T00:00:00.000Z'),
      to: new Date('2025-01-05T23:59:59.999Z'),
    });

    expect(
      computeRange('monthly', new Date('2026-05-01T09:00:00+01:00'), 'Europe/London').label,
    ).toBe('2026-04');
    expect(
      computeRange('quarterly', new Date('2026-04-01T09:00:00+01:00'), 'Europe/London').label,
    ).toBe('2026-Q1');
    expect(
      computeRange('yearly', new Date('2026-01-05T09:00:00+00:00'), 'Europe/London').label,
    ).toBe('2025');

    expect(() => computeRange('daily', new Date(), 'Not/A/Zone')).toThrow(/Invalid timezone/);
  });
});
