import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
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
  session: SessionEntity;

  @Column()
  feedbackTags: FEEDBACK_TAGS_ENUM;

  @Column()
  feedbackDescription: string;
}
