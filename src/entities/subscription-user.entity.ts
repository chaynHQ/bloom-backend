import { Column, Entity, JoinTable, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { SubscriptionEntity } from './subscription.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'subscription_user' })
export class SubscriptionUserEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'subscriptionUserId' })
  id: string;

  @Column()
  subscriptionInfo: string;

  @Column()
  subscriptionId: string;
  @ManyToOne(() => SubscriptionEntity, (subscriptionEntity) => subscriptionEntity.subscriptionUser)
  @JoinTable({ name: 'subscription', joinColumn: { name: 'subscriptionId' } })
  subscription;

  @Column()
  userId: string;
  @ManyToOne(() => UserEntity, (userEntity) => userEntity.subscriptionUser)
  @JoinTable({ name: 'user', joinColumn: { name: 'userId' } })
  user;

  @Column({ type: 'date', nullable: true })
  cancelledAt: Date;
}
