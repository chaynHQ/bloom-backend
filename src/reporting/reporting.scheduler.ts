import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Logger } from 'src/logger/logger';
import { reportingTimezone } from 'src/utils/constants';
import { CRON_EXPRESSIONS } from './reporting.constants';
import { ReportingService } from './reporting.service';
import { ReportPeriod } from './reporting.types';

/**
 * Thin shell around `ReportingService.run()` so the service itself stays
 * free of decorator-side-effects and trivially unit-testable. Each cron
 * fires at 09:00 local time — late enough that GA4 "yesterday" data has
 * stabilised (GA4 takes up to ~8h to finalise intraday data).
 */
@Injectable()
export class ReportingScheduler {
  private readonly logger = new Logger('ReportingScheduler');

  constructor(private readonly reportingService: ReportingService) {}

  @Cron(CRON_EXPRESSIONS.daily, { timeZone: reportingTimezone })
  runDaily(): Promise<void> {
    return this.fire('daily');
  }

  @Cron(CRON_EXPRESSIONS.weekly, { timeZone: reportingTimezone })
  runWeekly(): Promise<void> {
    return this.fire('weekly');
  }

  @Cron(CRON_EXPRESSIONS.monthly, { timeZone: reportingTimezone })
  runMonthly(): Promise<void> {
    return this.fire('monthly');
  }

  @Cron(CRON_EXPRESSIONS.quarterly, { timeZone: reportingTimezone })
  runQuarterly(): Promise<void> {
    return this.fire('quarterly');
  }

  @Cron(CRON_EXPRESSIONS.yearly, { timeZone: reportingTimezone })
  runYearly(): Promise<void> {
    return this.fire('yearly');
  }

  private async fire(period: ReportPeriod): Promise<void> {
    this.logger.log(`ReportingScheduler: firing ${period} (tz=${reportingTimezone})`);
    try {
      await this.reportingService.run(period, { trigger: 'scheduled' });
    } catch (err) {
      this.logger.error(
        `ReportingScheduler ${period} run threw: ${err?.message || 'unknown error'}`,
      );
    }
  }
}
