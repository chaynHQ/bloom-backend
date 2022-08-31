import { CAMPAIGN_TYPE } from 'src/utils/constants';

export interface IEmailCampaign {
  campaignType: CAMPAIGN_TYPE;
  email: string;
  emailSentDateTime: Date | string;
}
