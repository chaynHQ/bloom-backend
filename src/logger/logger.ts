import { ConsoleLogger, Inject } from '@nestjs/common';
import Rollbar from 'rollbar';
import { FIREBASE_ERRORS } from 'src/utils/errors';
import { isProduction, rollbarEnv, rollbarToken } from '../utils/constants';
import { ErrorLog } from './utils';
import { ClsService } from 'nestjs-cls';


export class Logger extends ConsoleLogger {
  private rollbar?: Rollbar;

  @Inject
  (ClsService) private readonly cls: ClsService;

  constructor(context?: string, isTimestampEnabled?) {
    super(context, isTimestampEnabled);
    this.initialiseRollbar();
  }

  log(message: string): void {
    const requestId = this.cls.getId();
    const decoratedMessage = `[Request ID: ${requestId}] ${message}`;
    super.log(decoratedMessage);
  }

  error(message: string | ErrorLog, trace?: string): void {
    const requestId = this.cls.getId();
    const sessionId = this.cls.get('sessionId');
    const decoratedMessage = `[Request ID: ${requestId}, Session ID: ${sessionId}] ${message}`;
    if (this.rollbar) {
      this.rollbar.error(decoratedMessage);
    }
    const formattedMessage = typeof decoratedMessage === 'string' ? decoratedMessage : JSON.stringify(message);

    const taggedMessage = `[error] ${formattedMessage}`;
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
        captureIp: 'anonymize',
        ignoredMessages: [...Object.values(FIREBASE_ERRORS)],
      });
    }
  }
}
