import { Column, Entity, JoinTable, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { STORYBLOK_STORY_STATUS_ENUM } from '../utils/constants';
import { BaseBloomEntity } from './base.entity';
import { CourseEntity } from './course.entity';
import { SessionFeedbackEntity } from './session-feedback.entity';
import { SessionUserEntity } from './session-user.entity';

@Entity({ name: 'session' })
export class SessionEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'sessionId' })
  id: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({
    nullable: true,
  })
  status: STORYBLOK_STORY_STATUS_ENUM;

  @Column({
    unique: true,
    nullable: true,
  })
  storyblokUuid: string;

  @Column()
  courseId: string;
  @ManyToOne(() => CourseEntity, (courseEntity) => courseEntity.session, { onDelete: 'CASCADE' })
  @JoinTable({ name: 'course', joinColumn: { name: 'courseId' } })
  course: CourseEntity;

  @OneToMany(() => SessionUserEntity, (sessionUserEntity) => sessionUserEntity.session, {
    cascade: true,
  })
  sessionUser: SessionUserEntity[];

  @OneToMany(
    () => SessionFeedbackEntity,
    (sessionFeedbackEntity) => sessionFeedbackEntity.session,
    {
      cascade: true,
    },
  )
  sessionFeedback: SessionFeedbackEntity[];
}
