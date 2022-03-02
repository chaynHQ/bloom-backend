import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { SIMPLYBOOK_ACTION_ENUM } from '../utils/constants';
import { BaseEntity } from './base.entity';

@Entity({ name: 'simply_book' })
export class SimplyBookEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  action: SIMPLYBOOK_ACTION_ENUM;

  @Column({ unique: true })
  client_email: string;

  @Column()
  service_name: string;

  @Column({ unique: true })
  booking_code: string;

  @Column({ type: 'date' })
  start_date_time: Date;

  @Column({ type: 'date', nullable: true })
  cancelledAt: Date;

  @Column()
  service_provider_name: string;

  @Column()
  client_timezone: string;

  @Column({ type: 'date' })
  end_date_time: Date;

  @Column()
  service_provider_email: string;
}
