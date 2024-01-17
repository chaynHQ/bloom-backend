import { Injectable, Logger } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { isProduction } from 'src/utils/constants';
import apiCall from '../apiCalls';

@Injectable()
export class SlackMessageClient {
  private readonly logger = new Logger('SlackClient');

  public async sendMessageToTherapySlackChannel(
    text: string,
  ): Promise<AxiosResponse<any, any> | string> {
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
}
