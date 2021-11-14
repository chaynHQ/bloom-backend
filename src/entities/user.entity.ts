import { PartnerAdminEntity } from '../entities/partner-admin.entity';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum LANGUAGE_DEFAULT {
  EN = 'en',
  ES = 'es',
}

@Entity({ name: 'user' })
export class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'userId' })
  id: string;

  @Column({ unique: true })
  firebaseUid: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  languageDefault: LANGUAGE_DEFAULT;

  @OneToOne(() => PartnerAccessEntity, (partnerAccess) => partnerAccess.user)
  partnerAccess: PartnerAccessEntity;

  @OneToOne(() => PartnerAdminEntity, (partnerAdmin) => partnerAdmin.user)
  partnerAdmin: PartnerAdminEntity;
}
