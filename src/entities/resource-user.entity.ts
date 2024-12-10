import { Column, Entity, JoinTable, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseBloomEntity } from './base.entity';
import { ResourceEntity } from './resource.entity';
import { UserEntity } from './user.entity';

// Many to many join table documentation can be found here: https://orkhan.gitbook.io/typeorm/docs/many-to-many-relations#many-to-many-relations-with-custom-properties

@Entity({ name: 'resource_user' })
export class ResourceUserEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'resourceUserId' })
  id: string;

  @Column({ type: 'date', nullable: true })
  completedAt: Date;

  @Column()
  resourceId: string;
  @ManyToOne(() => ResourceEntity, (resourceEntity) => resourceEntity.resourceUser, {
    onDelete: 'CASCADE',
  })
  @JoinTable({ name: 'resource', joinColumn: { name: 'resourceId' } })
  resource: ResourceEntity;

  @Column()
  userId: string;
  @ManyToOne(() => UserEntity, (userEntity) => userEntity.resourceUser, { onDelete: 'CASCADE' })
  @JoinTable({ name: 'user', joinColumn: { name: 'userId' } })
  user: UserEntity;
}
