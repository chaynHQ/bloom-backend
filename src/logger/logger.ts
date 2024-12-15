import { ConsoleLogger } from '@nestjs/common';
import Rollbar from 'rollbar';
import { FIREBASE_ERRORS } from 'src/utils/errors';
import { isProduction, rollbarEnv, rollbarToken } from '../utils/constants';
import { ErrorLog } from './utils';
import { ClsService, ClsServiceManager } from 'nestjs-cls';

interface LogMessage {
  event: string;
  userId: string;
  fields?: string[];
}

export class Logger extends ConsoleLogger {
  private rollbar?: Rollbar;
  private cls: ClsService;

  constructor(context?: string, isTimestampEnabled?) {
    super(context, isTimestampEnabled);
    this.cls = ClsServiceManager.getClsService();
    this.initialiseRollbar();
  }

  log(message: string | LogMessage): void {
    const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message);
    const requestId = this.cls.getId();
    const sessionId = this.cls.get('sessionId');
    const decoratedMessage = `[Request ID: ${requestId}, Session ID: ${sessionId}] ${formattedMessage}`;
    super.log(decoratedMessage);

  }

  error(message: string | ErrorLog, trace?: string): void {
    if (this.rollbar) {
      this.rollbar.error(message);
    }
    const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message);
    const requestId = this.cls.getId();
    const sessionId = this.cls.get('sessionId');
    const decoratedMessage = `[Request ID: ${requestId}, Session ID: ${sessionId}] ${formattedMessage}`;

    const taggedMessage = `[error] ${decoratedMessage}`;
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
