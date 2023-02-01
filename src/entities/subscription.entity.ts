import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { SubscriptionUserEntity } from './subscription-user.entity';

@Entity({ name: 'subscription' })
export class SubscriptionEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'subscriptionId' })
  id: string;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => SubscriptionUserEntity, (subscriptionUser) => subscriptionUser.subscription)
  subscriptionUser: SubscriptionUserEntity[];
}
