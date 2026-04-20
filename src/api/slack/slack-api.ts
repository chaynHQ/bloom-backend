import { Injectable } from '@nestjs/common';
import { Logger } from 'src/logger/logger';
import { AxiosResponse } from 'axios';
import {
  isProduction,
  slackBloomUsersWebhookUrl,
  slackDeletedUsersWebhookUrl,
  slackReportingWebhookUrl,
  slackWebhookUrl,
} from 'src/utils/constants';
import apiCall from '../apiCalls';

@Injectable()
export class SlackMessageClient {
  private readonly logger = new Logger('SlackClient');

  public async sendMessageToTherapySlackChannel(text: string): Promise<AxiosResponse | string> {
    if (!isProduction) return; // only send messages in production environment

    try {
      const response = await apiCall({
        url: slackWebhookUrl,
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
        url: slackBloomUsersWebhookUrl,
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
        url: slackDeletedUsersWebhookUrl,
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

  public async sendMessageToReportingChannel(
    blocks: unknown[],
    opts: { force?: boolean; fallbackText?: string } = {},
  ): Promise<AxiosResponse | string> {
    if (!isProduction && !opts.force) return;

    try {
      const response = await apiCall({
        url: slackReportingWebhookUrl,
        type: 'post',
        data: {
          text: opts.fallbackText ?? 'Bloom reporting digest',
          blocks,
        },
      });
      this.logger.log('Message sent to slack Reporting Channel');
      return response;
    } catch (err) {
      this.logger.error(
        `Unable to sendMessageToReportingChannel: ${err?.message || 'unknown error'}`,
      );
      return err;
    }
  }
}
