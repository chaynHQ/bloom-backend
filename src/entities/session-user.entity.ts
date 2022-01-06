import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { SessionEntity } from './session.entity';

@Entity({ name: 'course_user' })
export class SessionUserEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'courseUserId' })
  id: string;

  @Column()
  completed: boolean;

  @Column()
  sessionId: string;
  @ManyToMany(() => SessionEntity, (sessionEntity) => sessionEntity.sessionUser)
  @JoinTable({ name: 'session', joinColumn: { name: 'sessionId' } })
  session: SessionEntity[];
}
