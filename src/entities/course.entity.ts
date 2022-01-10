import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
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
  storyblokid: string;

  @OneToMany(() => SessionEntity, (sessionEntity) => sessionEntity.course)
  session: SessionEntity[];
}
