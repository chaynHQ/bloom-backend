import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { CAMPAIGN_TYPE } from 'src/utils/constants';
import { BaseEntity } from './base.entity';

@Entity({ name: 'email_campaign' })
export class EmailCampaignEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  campaignType: CAMPAIGN_TYPE;

  @Column({ unique: true })
  campaignInfo: string;

  @Column()
  email: string;

  @Column({ type: 'timestamptz', nullable: true })
  emailSentDateTime: Date;
}
