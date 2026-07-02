import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UNREAD_NOTIFICATION_STATUS } from '../front-chat/front-chat.interface';
import { BaseBloomEntity } from './base.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'chat_user' })
export class ChatUserEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'chatUserId' })
  id: string;

  @Column()
  userId: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ nullable: true })
  frontContactId: string | null;

  @Column({ nullable: true })
  frontConversationId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastMessageSentAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastMessageReceivedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastMessageReadAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  unreadNotificationAttemptedAt: Date | null;

  @Column({
    type: 'enum',
    enum: UNREAD_NOTIFICATION_STATUS,
    nullable: true,
  })
  unreadNotificationStatus: UNREAD_NOTIFICATION_STATUS | null;

  @Column({ nullable: true })
  unreadNotificationError: string | null;

  @Column({ default: 0 })
  unreadNotificationAttempts: number;
}
