import { Column, Entity, JoinTable, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
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
    nullable: true,
  })
  storyblokId: number;

  @Column({
    unique: true,
    nullable: true,
  })
  storyblokUuid: string;

  @OneToMany(() => ResourceUserEntity, (resourceUserEntity) => resourceUserEntity.resource, {
    cascade: true,
  })
  @JoinTable({ name: 'resourceUser', joinColumn: { name: 'resourceUserId' } })
  resourceUser: ResourceUserEntity[];

  @OneToMany(
    () => ResourceFeedbackEntity,
    (resourceFeedbackEntity) => resourceFeedbackEntity.resource,
    {
      cascade: true,
    },
  )
  @JoinTable({ name: 'resourceFeedback', joinColumn: { name: 'resourceFeedbackId' } })
  resourceFeedback: ResourceFeedbackEntity[];
}
