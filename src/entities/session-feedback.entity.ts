import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FEEDBACK_TAGS_ENUM } from '../utils/constants';
import { BaseBloomEntity } from './base.entity';
import { SessionEntity } from './session.entity';

@Entity({ name: 'session_feedback' })
export class SessionFeedbackEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'sessionFeedbackId' })
  sessionFeedbackId: string;

  @ManyToOne(() => SessionEntity, (sessionEntity) => sessionEntity.sessionFeedback, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sessionId' })
  session: SessionEntity | null;

  // Must remain nullable due to existing null values in prod database (following bug presesnt jan-dec 2025)
  @Column({ name: 'sessionId', nullable: true })
  sessionId: string | null;

  @Column()
  feedbackTags: FEEDBACK_TAGS_ENUM;

  @Column()
  feedbackDescription: string;
}
