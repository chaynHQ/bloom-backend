import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity({ name: 'therapy_feedback' })
export class TherapyFeedbackEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'therapyFeedbackId' })
  id: string;

  @Column()
  bookingCode: string;

  @Column()
  email: string;

  @Column({ type: Boolean, default: false })
  isFeedbackSent: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  feedbackSentDateTime: Date;
}
