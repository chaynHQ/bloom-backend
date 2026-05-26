import { DateTime } from 'luxon';
import { ReportPeriod, ReportWindow } from './reporting.types';

/**
 * Compute the report window for a given cadence, evaluated at `now`.
 *
 * - daily:     previous calendar day in `timezone`
 * - weekly:    previous ISO week (Mon–Sun) in `timezone`
 * - monthly:   previous calendar month in `timezone`
 * - quarterly: previous calendar quarter (Jan–Mar / Apr–Jun / etc.) in `timezone`
 * - yearly:    previous calendar year in `timezone`
 *
 * Returned `from`/`to` are UTC instants covering the entire local-TZ range.
 */
export function computeRange(
  period: ReportPeriod,
  now: Date,
  timezone: string,
): ReportWindow {
  const zoned = DateTime.fromJSDate(now, { zone: timezone });
  if (!zoned.isValid) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  switch (period) {
    case 'daily': {
      const fromZoned = zoned.minus({ days: 1 }).startOf('day');
      const toZoned = fromZoned.endOf('day');
      return {
        from: fromZoned.toUTC().toJSDate(),
        to: toZoned.toUTC().toJSDate(),
        label: fromZoned.toFormat('yyyy-LL-dd'),
        timezone,
      };
    }
    case 'weekly': {
      // ISO week year can differ from calendar year at the boundary
      // (e.g. 2024-12-30 is in ISO week 2025-W01), hence kkkk-'W'WW.
      const fromZoned = zoned.minus({ weeks: 1 }).startOf('week');
      const toZoned = fromZoned.endOf('week');
      return {
        from: fromZoned.toUTC().toJSDate(),
        to: toZoned.toUTC().toJSDate(),
        label: fromZoned.toFormat("kkkk-'W'WW"),
        timezone,
      };
    }
    case 'monthly': {
      const fromZoned = zoned.minus({ months: 1 }).startOf('month');
      const toZoned = fromZoned.endOf('month');
      return {
        from: fromZoned.toUTC().toJSDate(),
        to: toZoned.toUTC().toJSDate(),
        label: fromZoned.toFormat('yyyy-LL'), // e.g. "2026-03"
        timezone,
      };
    }
    case 'quarterly': {
      const fromZoned = zoned.minus({ quarters: 1 }).startOf('quarter');
      const toZoned = fromZoned.endOf('quarter');
      return {
        from: fromZoned.toUTC().toJSDate(),
        to: toZoned.toUTC().toJSDate(),
        label: `${fromZoned.year}-Q${fromZoned.quarter}`,
        timezone,
      };
    }
    case 'yearly': {
      const fromZoned = zoned.minus({ years: 1 }).startOf('year');
      const toZoned = fromZoned.endOf('year');
      return {
        from: fromZoned.toUTC().toJSDate(),
        to: toZoned.toUTC().toJSDate(),
        label: `${fromZoned.year}`,
        timezone,
      };
    }
  }
}
