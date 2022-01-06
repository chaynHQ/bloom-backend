import { Column, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { CourseUserEntity } from './course-user.entity';
import { SessionEntity } from './session.entity';

@Entity({ name: 'course' })
export class CourseEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'courseId' })
  id: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column()
  active: boolean;

  @Column()
  storyBlokId: string;

  @OneToMany(() => SessionEntity, (sessionEntity) => sessionEntity.course)
  session: SessionEntity[];

  @ManyToMany(() => CourseUserEntity, (courseUser) => courseUser.course)
  courseUser: CourseUserEntity[];
}
