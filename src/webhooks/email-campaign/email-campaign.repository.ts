import { Injectable } from '@nestjs/common';
import { EmailCampaignEntity } from 'src/entities/email-campaign.entity';
import { Repository } from 'typeorm';

@Injectable()
export class EmailCampaignRepository extends Repository<EmailCampaignEntity> {}
