import { EmailCampaignEntity } from 'src/entities/email-campaign.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(EmailCampaignEntity)
export class EmailCampaignRepository extends Repository<EmailCampaignEntity> {}
