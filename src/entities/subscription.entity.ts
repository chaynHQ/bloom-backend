import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SubscriptionUserEntity } from './subscription-user.entity';

// NB: The base entity imported here is wrong. The base entity within the project should be imported.
// This should be fixed by adding a createdAt and updatedAt column to the subscription table at a later date.
@Entity({ name: 'subscription' })
export class SubscriptionEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'subscriptionId' })
  id: string;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => SubscriptionUserEntity, (subscriptionUser) => subscriptionUser.subscription)
  subscriptionUser: SubscriptionUserEntity[];
}
