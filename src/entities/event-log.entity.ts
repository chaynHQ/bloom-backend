import { EventLogMetadata } from 'src/event-logger/event-logger.interface';
import { Column, Entity, JoinTable, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseBloomEntity } from '../entities/base.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'event_log' })
export class EventLogEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'eventLogId' })
  id: string;

  @Column({ type: 'timestamptz' })
  date: Date;

  @Column()
  event: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: EventLogMetadata = {};

  @Column()
  userId: string;
  @ManyToOne(() => UserEntity, (UserEntity) => UserEntity.eventLog, {
    onDelete: 'CASCADE',
  })
  @JoinTable({ name: 'user', joinColumn: { name: 'userId' } })
  user: UserEntity;
}
