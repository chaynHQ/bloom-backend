import { Column, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { CourseEntity } from './course.entity';
import { SessionUserEntity } from './session-user.entity';

@Entity({ name: 'session' })
export class SessionEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'sessionId' })
  id: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column()
  active: boolean;

  @Column()
  storyBlokId: string;

  @Column()
  courseId: string;
  @ManyToOne(() => CourseEntity, (courseEntity) => courseEntity.session)
  @JoinTable({ name: 'course', joinColumn: { name: 'courseId' } })
  course: CourseEntity;

  @ManyToMany(() => SessionUserEntity, (sessionUserEntity) => sessionUserEntity.session)
  sessionUser: SessionUserEntity[];
}
