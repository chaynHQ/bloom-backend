import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseBloomEntity } from './base.entity';
import { SubscriptionUserEntity } from './subscription-user.entity';

@Entity({ name: 'subscription' })
export class SubscriptionEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'subscriptionId' })
  id: string;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => SubscriptionUserEntity, (subscriptionUser) => subscriptionUser.subscription, {
    cascade: true,
  })
  subscriptionUser: SubscriptionUserEntity[];
}
