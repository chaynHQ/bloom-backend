import { SIMPLYBOOK_STORY_STATUS_ENUM } from 'src/utils/constants';
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

  @Column()
  active: SIMPLYBOOK_STORY_STATUS_ENUM;

  @Column()
  storyblokid: string;
}
