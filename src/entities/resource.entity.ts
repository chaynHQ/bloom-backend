import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RESOURCE_CATEGORIES, STORYBLOK_STORY_STATUS_ENUM } from '../utils/constants';
import { BaseBloomEntity } from './base.entity';
import { ResourceFeedbackEntity } from './resource-feedback.entity';
import { ResourceUserEntity } from './resource-user.entity';

@Entity({ name: 'resource' })
export class ResourceEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'resourceId' })
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
    nullable: false,
  })
  category: RESOURCE_CATEGORIES;

  @Column({
    unique: true,
  })
  storyblokUuid: string;

  @Column({
    unique: true,
  })
  storyblokId: number;

  @OneToMany(() => ResourceUserEntity, (resourceUserEntity) => resourceUserEntity.resource, {
    cascade: true,
  })
  resourceUser: ResourceUserEntity[];

  @OneToMany(
    () => ResourceFeedbackEntity,
    (resourceFeedbackEntity) => resourceFeedbackEntity.resource,
    {
      cascade: true,
    },
  )
  resourceFeedback: ResourceFeedbackEntity[];
}
