import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseBloomEntity } from './base.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'chat_user' })
export class ChatUserEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'chatUserId' })
  id: string;

  @Column()
  userId: string;

  @OneToOne(() => UserEntity)
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
  lastUnreadNotifiedAt: Date | null;
}
