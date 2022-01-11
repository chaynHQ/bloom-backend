import { ConsoleLogger } from '@nestjs/common';
import Rollbar from 'rollbar';
import { isProduction, rollbarEnv, rollbarToken } from '../utils/constants';

export class Logger extends ConsoleLogger {
  private rollbar?: Rollbar;

  constructor(context?: string, isTimestampEnabled?: any) {
    super(context, isTimestampEnabled);

    this.initialiseRollbar();
  }

  error(message: string, trace?: string): void {
    if (this.rollbar) {
      this.rollbar.error(message);
    }

    const taggedMessage = `[error] ${message}`;
    super.error(taggedMessage, trace);
  }

  private initialiseRollbar() {
    // Values MUST be set in production mode.
    // But, can set ROLLBAR_TOKEN to 'false' if you want to disable rollbar logging.
    if (isProduction && (!rollbarEnv || !rollbarToken)) {
      throw new Error(
        'Both ROLLBAR_ENV and ROLLBAR_TOKEN must be provided in the environment config.',
      );
    }

    if (rollbarEnv && rollbarToken) {
      this.rollbar = new Rollbar({
        enabled: rollbarToken !== 'false',
        environment: rollbarEnv,
        accessToken: rollbarToken,
        captureUncaught: true,
        captureUnhandledRejections: true,
      });
    }
  }
}
