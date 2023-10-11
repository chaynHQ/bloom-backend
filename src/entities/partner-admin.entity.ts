import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PartnerEntity } from '../entities/partner.entity';
import { UserEntity } from '../entities/user.entity';
import { BaseBloomEntity } from './base.entity';
import { PartnerAccessEntity } from './partner-access.entity';

@Entity({ name: 'partner_admin' })
export class PartnerAdminEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'partnerAdminId' })
  id: string;

  @Column({ nullable: true })
  userId: string;
  @OneToOne(() => UserEntity, (userEntity) => userEntity.partnerAdmin, {
    primary: true,
    eager: true,
  })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  partnerId: string;
  @ManyToOne(() => PartnerEntity, (partnerEntity) => partnerEntity.partnerAdmin)
  @JoinTable({ name: 'partner', joinColumn: { name: 'partnerId' } })
  partner: PartnerEntity;

  @OneToMany(() => PartnerAccessEntity, (partnerAccess) => partnerAccess.partnerAdmin)
  partnerAccess: PartnerAccessEntity[];

  @Column({ type: Boolean, nullable: false, default: true })
  active: boolean;
}
