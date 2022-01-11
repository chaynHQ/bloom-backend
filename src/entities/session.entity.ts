import { Column, Entity, JoinTable, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { STORYBLOK_STORY_STATUS_ENUM } from '../utils/constants';
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

  @Column({
    unique: true,
    nullable: true,
  })
  status: STORYBLOK_STORY_STATUS_ENUM;

  @Column({
    unique: true,
    nullable: true,
  })
  storyblokid: string;

  @Column()
  courseId: string;
  @ManyToOne(() => CourseEntity, (courseEntity) => courseEntity.session)
  @JoinTable({ name: 'course', joinColumn: { name: 'courseId' } })
  course: CourseEntity;

  @OneToMany(() => SessionUserEntity, (sessionUserEntity) => sessionUserEntity.session)
  sessionUser: SessionUserEntity[];
}
