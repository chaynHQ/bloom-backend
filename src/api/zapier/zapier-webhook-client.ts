import { Injectable, Logger } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { respondIoCreateContactWebhook } from '../../utils/constants';
import apiCall from '../apiCalls';

@Injectable()
export class ZapierWebhookClient {
  private readonly logger = new Logger('ZapierWebhookClient');

  public async addContactToRespondIO({
    phonenumber,
    name,
  }: AddContactParams): Promise<AxiosResponse<any, any> | string> {
    try {
      const response = await apiCall({
        url: respondIoCreateContactWebhook,
        type: 'post',
        data: {
          phonenumber,
          name,
        },
      });
      this.logger.log('Contact added successfully to respond.io');
      return response;
    } catch (err) {
      this.logger.error('Unable to add contact to respond.io');
      throw err;
    }
  }
}

export type AddContactParams = {
  phonenumber: string;
  name: string;
};
