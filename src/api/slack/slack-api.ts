import { Injectable, Logger } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { isProduction } from 'src/utils/constants';
import apiCall from '../apiCalls';

@Injectable()
export class SlackMessageClient {
  private readonly logger = new Logger('SlackClient');

  public async sendMessageToTherapySlackChannel(text: string): Promise<AxiosResponse | string> {
    if (!isProduction) return; // only send messages in production environment

    try {
      const response = await apiCall({
        url: process.env.SLACK_WEBHOOK_URL,
        type: 'post',
        data: {
          text: text,
        },
      });
      this.logger.log('Message sent to slack Therapy Channel');
      return response;
    } catch (err) {
      this.logger.error('Unable to sendMessageToTherapySlackChannel');
      return err;
    }
  }

  public async sendMessageToBloomUserChannel(text: string): Promise<AxiosResponse | string> {
    if (!isProduction) return; // only send messages in production environment

    try {
      const response = await apiCall({
        url: process.env.SLACK_BLOOM_USERS_WEBHOOK_URL,
        type: 'post',
        data: {
          text: text,
        },
      });
      this.logger.log({ event: 'SESSION_FEEDBACK_SLACK_MESSAGE_SENT' });
      return response;
    } catch (err) {
      this.logger.error('Unable to sendMessageToBloomUserSlackChannel', err);
      return err;
    }
  }
}
