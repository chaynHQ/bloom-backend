import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FEEDBACK_TAGS_ENUM } from '../utils/constants';
import { BaseBloomEntity } from './base.entity';
import { ResourceEntity } from './resource.entity';

@Entity({ name: 'resource_feedback' })
export class ResourceFeedbackEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'resourceFeedbackId' })
  id: string;

  @Column()
  resourceId: string;

  @ManyToOne(() => ResourceEntity, (resourceEntity) => resourceEntity.resourceFeedback, {
    onDelete: 'CASCADE',
  })
  resource: ResourceEntity;

  @Column()
  feedbackTags: FEEDBACK_TAGS_ENUM;

  @Column()
  feedbackDescription: string;
}
