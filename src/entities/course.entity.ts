import { Column, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { STORYBLOK_STORY_STATUS_ENUM, THEMES } from '../utils/constants';
import { BaseBloomEntity } from './base.entity';
import { CoursePartnerEntity } from './course-partner.entity';
import { CourseUserEntity } from './course-user.entity';
import { ResourceEntity } from './resource.entity';
import { SessionEntity } from './session.entity';

@Entity({ name: 'course' })
export class CourseEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'courseId' })
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
    type: 'enum',
    enum: THEMES,
    array: true,
    nullable: true,
  })
  themes: THEMES[];

  @Column({
    unique: true,
    nullable: true,
  })
  storyblokUuid: string;

  // A modular course's resources, from its Storyblok `sessions` field. Empty for courses built from
  // weeks of sessions, which link through `session.courseId` instead.
  @ManyToMany(() => ResourceEntity, (resource) => resource.courses)
  @JoinTable({
    name: 'course_resource',
    joinColumn: { name: 'courseId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'resourceId', referencedColumnName: 'id' },
  })
  resources: ResourceEntity[];

  @OneToMany(() => SessionEntity, (sessionEntity) => sessionEntity.course, { cascade: true })
  session: SessionEntity[];

  @OneToMany(() => CourseUserEntity, (courseUser) => courseUser.course, { cascade: true })
  courseUser: CourseUserEntity[];

  @OneToMany(() => CoursePartnerEntity, (coursePartner) => coursePartner.course, { cascade: true })
  coursePartner: CoursePartnerEntity[];
}
