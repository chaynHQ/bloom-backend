import { Injectable, Logger } from '@nestjs/common';
import apiCall from '../apiCalls';

@Injectable()
export class SlackMessageClient {
  private readonly logger = new Logger('SlackClient');

  public async sendMessageToTherapySlackChannel(text: string) {
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
