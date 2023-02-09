import { Injectable, Logger } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import {
  respondIoCreateContactWebhook,
  respondIoDeleteContactWebhook,
} from '../../utils/constants';
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

  public async deleteContactFromRespondIO({
    phonenumber,
  }: DeleteContactParams): Promise<AxiosResponse<any, any> | string> {
    try {
      const response = await apiCall({
        url: respondIoDeleteContactWebhook,
        type: 'post',
        data: {
          phonenumber,
        },
      });
      this.logger.log(
        `Triggered webhook to delete contact from respond.io with number ${phonenumber}`,
      );
      return response;
    } catch (err) {
      this.logger.error(`Unable to delete contact from respond.io with number ${phonenumber}`);
      throw err;
    }
  }
}

export type AddContactParams = {
  phonenumber: string;
  name: string;
};

export type DeleteContactParams = {
  phonenumber: string;
};
