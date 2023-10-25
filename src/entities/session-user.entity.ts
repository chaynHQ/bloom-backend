import { Column, Entity, JoinTable, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { BaseBloomEntity } from './base.entity';
import { CourseUserEntity } from './course-user.entity';
import { SessionEntity } from './session.entity';

@Entity({ name: 'session_user' })
@Unique('session_user_index_name', ['courseUserId', 'sessionId'])
export class SessionUserEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'sessionUserId' })
  id: string;

  @Column()
  completed: boolean;

  @Column({ type: 'date', nullable: true })
  completedAt: Date;

  @Column()
  sessionId: string;
  @ManyToOne(() => SessionEntity, (sessionEntity) => sessionEntity.sessionUser, {
    onDelete: 'CASCADE',
  })
  @JoinTable({ name: 'session', joinColumn: { name: 'sessionId' } })
  session: SessionEntity;

  @Column()
  courseUserId: string;
  @ManyToOne(() => CourseUserEntity, (courseUser) => courseUser.sessionUser, {
    onDelete: 'CASCADE',
  })
  @JoinTable({ name: 'course_user', joinColumn: { name: 'courseUserId' } })
  courseUser: CourseUserEntity;
}
