import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Logger } from 'src/logger/logger';
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
  }: AddContactParams): Promise<AxiosResponse | string> {
    try {
      const response = await apiCall({
        url: respondIoCreateContactWebhook,
        type: 'post',
        data: {
          phonenumber,
          name,
        },
      });
      this.logger.log('Triggered webhook to add contact to respond.io');
      return response;
    } catch (err) {
      this.logger.error(`Unable to add contact to respond.io: ${err?.message || 'unknown error'}`);
      throw err;
    }
  }

  public async deleteContactFromRespondIO({
    phonenumber,
  }: DeleteContactParams): Promise<AxiosResponse | string> {
    try {
      const response = await apiCall({
        url: respondIoDeleteContactWebhook,
        type: 'post',
        data: {
          phonenumber,
        },
      });
      this.logger.log('Triggered webhook to delete contact from respond.io');
      return response;
    } catch (err) {
      this.logger.error(`Unable to delete contact from respond.io: ${err?.message || 'unknown error'}`);
      throw new HttpException('Unable to delete contact from respond.io', HttpStatus.BAD_REQUEST);
    }
  }
}

type AddContactParams = {
  phonenumber: string;
  name: string;
};

type DeleteContactParams = {
  phonenumber: string;
};
