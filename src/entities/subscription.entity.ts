import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'subscription' })
export class SubscriptionEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'subscriptionId' })
  id: string;

  @Column({ unique: true })
  name: string;
}
