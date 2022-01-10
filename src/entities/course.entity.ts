import { SIMPLYBOOK_STORY_STATUS_ENUM } from '../utils/constants';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity({ name: 'course' })
export class CourseEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'courseId' })
  id: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({
    unique: true,
    nullable: true,
  })
  active: SIMPLYBOOK_STORY_STATUS_ENUM;

  @Column({
    unique: true,
    nullable: true,
  })
  storyblokid: string;
}
