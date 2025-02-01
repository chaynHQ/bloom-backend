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

interface RequestContext {
  requestId: string;
  sessionId: string;
}

export class Logger extends ConsoleLogger {
  private rollbar?: Rollbar;
  private cls: ClsService;

  constructor(context?: string, isTimestampEnabled?) {
    super(context, isTimestampEnabled);
    this.cls = ClsServiceManager.getClsService();
    this.initialiseRollbar();
  }

  getRequestContext(): RequestContext {
    try {
      return {
        requestId: this.cls.getId(),
        sessionId: this.cls.get('sessionId'),
      };
    } catch {
      console.log('Error getting request context');
      return {
        requestId: 'not set',
        sessionId: 'not set',
      };
    }
  }

  log(message: string | LogMessage): void {
    const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message);
    const requestContext = this.getRequestContext();
    const decoratedMessage = `[Request ID: ${requestContext.requestId}, Session ID: ${requestContext.sessionId}] ${formattedMessage}`;
    super.log(decoratedMessage);
  }

  warn(message: string | ErrorLog, trace?: string): void {
    try {
      const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message);
      const requestContext = this.getRequestContext();
      const decoratedMessage = `[Request ID: ${requestContext.requestId}, Session ID: ${requestContext.sessionId}] ${formattedMessage}`;
      const taggedMessage = `[warn] ${decoratedMessage}`;
      super.warn(taggedMessage, trace);
    } catch {
      console.error('Error logging warning');
    }
  }

  error(message: string | ErrorLog, trace?: string): void {
    if (this.rollbar) {
      this.rollbar.error(message);
    }
    const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message);
    const requestContext = this.getRequestContext();
    const decoratedMessage = `[Request ID: ${requestContext.requestId}, Session ID: ${requestContext.sessionId}] ${formattedMessage}`;

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
