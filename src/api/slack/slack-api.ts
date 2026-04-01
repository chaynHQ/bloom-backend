import { Injectable } from '@nestjs/common';
import { Logger } from 'src/logger/logger';
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
      this.logger.error(`Unable to sendMessageToTherapySlackChannel: ${err?.message || 'unknown error'}`);
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
      this.logger.log('Message sent to slack Bloom User Channel');
      return response;
    } catch (err) {
      this.logger.error(`Unable to sendMessageToBloomUserSlackChannel: ${err?.message || 'unknown error'}`);
      return err;
    }
  }

  public async sendMessageToDeletedUsersSlackChannel(
    text: string,
  ): Promise<AxiosResponse | string> {
    if (!isProduction) return; // only send messages in production environment

    try {
      const response = await apiCall({
        url: process.env.SLACK_BLOOM_DELETED_USERS_WEBHOOK_URL,
        type: 'post',
        data: {
          text: text,
        },
      });
      this.logger.log('Message sent to slack Deleted Users Channel');
      return response;
    } catch (err) {
      this.logger.error(`Unable to sendMessageToDeletedUsersSlackChannel: ${err?.message || 'unknown error'}`);
      return err;
    }
  }
}
