import {
  Column,
  Entity,
  JoinTable,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { STORYBLOK_STORY_STATUS_ENUM } from '../utils/constants';
import { BaseEntity } from './base.entity';
import { CourseEntity } from './course.entity';
import { PartnerEntity } from './partner.entity';
import { SessionUserEntity } from './session-user.entity';

@Entity({ name: 'course_partner' })
@Unique('course_partner_index_name', ['partnerId', 'courseId'])
export class CoursePartnerEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'coursePartnerId' })
  id: string;

  @Column()
  status: STORYBLOK_STORY_STATUS_ENUM;

  @Column({ nullable: true })
  partnerId: string;
  @ManyToOne(() => PartnerEntity, (partnerEntity) => partnerEntity.partner)
  @JoinTable({ name: 'partner', joinColumn: { name: 'partnerId' } })
  partner: PartnerEntity;

  @Column()
  courseId: string;
  @ManyToOne(() => CourseEntity, (courseEntity) => courseEntity.courseUser)
  @JoinTable({ name: 'course', joinColumn: { name: 'courseId' } })
  course: CourseEntity;

  @OneToMany(() => SessionUserEntity, (sessionUserEntity) => sessionUserEntity.courseUser)
  sessionUser: SessionUserEntity[];
}
