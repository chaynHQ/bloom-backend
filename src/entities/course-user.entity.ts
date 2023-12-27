import {
  Column,
  Entity,
  JoinTable,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { BaseBloomEntity } from './base.entity';
import { CourseEntity } from './course.entity';
import { SessionUserEntity } from './session-user.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'course_user' })
@Unique('course_user_index_name', ['userId', 'courseId'])
export class CourseUserEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'courseUserId' })
  id: string;

  @Column()
  completed: boolean;

  @Column({ type: 'date', nullable: true })
  completedAt: Date;

  @Column()
  userId: string;
  @ManyToOne(() => UserEntity, (userEntity) => userEntity.courseUser, { onDelete: 'CASCADE' })
  @JoinTable({ name: 'user', joinColumn: { name: 'userId' } })
  user: UserEntity;

  @Column()
  courseId: string;

  @ManyToOne(() => CourseEntity, (courseEntity) => courseEntity.courseUser)
  @JoinTable({ name: 'course', joinColumn: { name: 'courseId' } })
  course: CourseEntity;

  @OneToMany(() => SessionUserEntity, (sessionUserEntity) => sessionUserEntity.courseUser, {
    cascade: true,
  })
  sessionUser: SessionUserEntity[];
}
