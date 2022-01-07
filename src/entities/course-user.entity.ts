import { Column, Entity, JoinTable, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { CourseEntity } from './course.entity';
import { SessionUserEntity } from './session-user.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'course_user' })
export class CourseUserEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'courseUserId' })
  id: string;

  @Column()
  completed: boolean;

  @Column()
  userId: string;
  @ManyToOne(() => UserEntity, (userEntity) => userEntity.courseUser)
  @JoinTable({ name: 'user', joinColumn: { name: 'userId' } })
  user: UserEntity;

  @Column()
  courseId: string;
  @ManyToOne(() => CourseEntity, (courseEntity) => courseEntity.courseUser)
  @JoinTable({ name: 'course', joinColumn: { name: 'courseId' } })
  course: CourseEntity;

  @OneToMany(() => SessionUserEntity, (sessionUserEntity) => sessionUserEntity.courseUser)
  sessionUser: SessionUserEntity[];
}
