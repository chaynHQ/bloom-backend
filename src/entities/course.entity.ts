import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { STORYBLOK_STORY_STATUS_ENUM } from '../utils/constants';
import { BaseBloomEntity } from './base.entity';
import { CoursePartnerEntity } from './course-partner.entity';
import { CourseUserEntity } from './course-user.entity';
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
    unique: true,
    nullable: true,
  })
  storyblokUuid: string;

  @OneToMany(() => SessionEntity, (sessionEntity) => sessionEntity.course, { cascade: true })
  session: SessionEntity[];

  @OneToMany(() => CourseUserEntity, (courseUser) => courseUser.course, { cascade: true })
  courseUser: CourseUserEntity[];

  @OneToMany(() => CoursePartnerEntity, (coursePartner) => coursePartner.course, { cascade: true })
  coursePartner: CoursePartnerEntity[];
}
