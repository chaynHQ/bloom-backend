import { Column, Entity, JoinTable, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { CourseUserEntity } from './course-user.entity';
import { SessionEntity } from './session.entity';

@Entity({ name: 'session_user' })
export class SessionUserEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'sessionUserId' })
  id: string;

  @Column()
  completed: boolean;

  @Column()
  sessionId: string;
  @ManyToOne(() => SessionEntity, (sessionEntity) => sessionEntity.sessionUser)
  @JoinTable({ name: 'session', joinColumn: { name: 'sessionId' } })
  session: SessionEntity[];

  @Column()
  courseUserId: string;
  @ManyToOne(() => CourseUserEntity, (courseUser) => courseUser.sessionUser)
  @JoinTable({ name: 'course_user', joinColumn: { name: 'courseUserId' } })
  courseUser: CourseUserEntity[];
}
