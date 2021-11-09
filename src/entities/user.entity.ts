import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { Column, Entity, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum LANGUAGE_DEFAULT {
  EN = 'en',
  ES = 'es',
}

@Entity()
export class UserEntity extends BaseEntity {
  @Column({ unique: true })
  firebaseUid: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  languageDefault: LANGUAGE_DEFAULT;

  @OneToOne(() => PartnerAccessEntity, (partnerAccess) => partnerAccess.user, {
    eager: true,
  })
  partnerAccess: PartnerAccessEntity;

  @OneToOne(() => PartnerAdminEntity, (partnerAdmin) => partnerAdmin.user)
  partnerAdmin: PartnerAdminEntity;
}
