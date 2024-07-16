import { Column, Entity, JoinTable, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FEEDBACK_TAGS_ENUM } from '../utils/constants';
import { BaseBloomEntity } from './base.entity';
import { SessionEntity } from './session.entity';

@Entity({ name: 'session_feedback' })
export class SessionFeedbackEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'sessionFeedbackId' })
  sessionFeedbackId: string;

  @Column()
  sessionId: string;
  @ManyToOne(() => SessionEntity, (sessionEntity) => sessionEntity.sessionUser, {
    onDelete: 'CASCADE',
  })
  @JoinTable({ name: 'session', joinColumn: { name: 'sessionId' } })
  session: SessionEntity;

  @Column()
  feedbackTags: FEEDBACK_TAGS_ENUM;

  @Column()
  feedbackDescription: string;
}
