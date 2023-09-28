import mailchimpClient from '@mailchimp/mailchimp_transactional';
import { Injectable, Logger } from '@nestjs/common';
import {
  mailchimpImpactMeasurementTemplateId,
  mailchimpMandrillApiKey,
  mailchimpTherapyFromEmail,
  mailchimpTherapyTemplateId,
} from 'src/utils/constants';

export enum MAILCHIMP_EMAIL_STATUS {
  SENT = 'sent',
}
export enum MAILCHIMP_EMAIL_TO {
  TO = 'to',
}
export type MailchimpEmailResponse = Array<{
  _id: string;
  email: string;
  reject_reason: string | null;
  status: MAILCHIMP_EMAIL_STATUS;
}>;
export type MailChimpTemplateMessage = {
  from_email: string;
  subject: string;
  to: Array<{
    email: string;
    type: string;
  }>;
};

const mailchimp = mailchimpClient(mailchimpMandrillApiKey);

@Injectable()
export class MailchimpClient {
  private readonly logger = new Logger('MailchimpClient');

  public async healthCheck(): Promise<string | null> {
    try {
      const response = await mailchimp.users.ping();
      return response;
    } catch (error) {
      this.logger.error(` Mail chimp health check failed: ${error}`);
      throw new Error(`Mail chimp health check failed: ${error}`);
    }
  }
  public async sendTemplateEmail(
    templateId: string,
    message: MailChimpTemplateMessage,
  ): Promise<MailchimpEmailResponse | null> {
    try {
      const response = await mailchimp.messages.sendTemplate({
        template_name: templateId,
        template_content: [{}],
        message,
      });
      // Mailchimp api doesn't throw so we capture the error in the response
      if (response.response.data.status === 'error') {
        throw new Error(
          `sendTemplateEmail - ${response.response.data.name} - ${response.response.data.message}`,
        );
      }
      return response;
    } catch (error) {
      this.logger.error(`Failed to send template email: ${error}`);
      throw new Error(error);
    }
  }
  public async sendTherapyFeedbackEmail(toEmail: string): Promise<MailchimpEmailResponse | null> {
    try {
      const response = await this.sendTemplateEmail(mailchimpTherapyTemplateId, {
        from_email: mailchimpTherapyFromEmail,
        subject: 'Bloom Therapy - How did it go?',
        to: [
          {
            email: toEmail,
            type: 'to',
          },
        ],
      });
      return response;
    } catch (error) {
      this.logger.error(`Error sending therapy template email`);
      throw new Error(`Error sending therapy template email`);
    }
  }

  public async sendImpactMeasurementEmail(toEmail: string): Promise<MailchimpEmailResponse | null> {
    try {
      const response = await this.sendTemplateEmail(mailchimpImpactMeasurementTemplateId, {
        from_email: mailchimpTherapyFromEmail,
        subject: 'Have you felt supported by Bloom?',
        to: [
          {
            email: toEmail,
            type: 'to',
          },
        ],
      });
      return response;
    } catch (error) {
      this.logger.error(`Error sending therapy template email ${error}`);
      throw new Error(`Error sending therapy template email ${error}`);
    }
  }
}
