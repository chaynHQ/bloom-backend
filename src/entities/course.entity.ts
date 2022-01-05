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
  active: boolean;

  @Column()
  storyBlokId: string;
}
