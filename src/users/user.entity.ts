import { Base } from 'src/Base';
import { PartnerAdminEntity } from 'src/partner-admin/partner-admin.entity';
import { PartnerAccessEntity } from 'src/partners-access/partner-access.entity';
import { Column, Entity, ManyToOne, OneToOne } from 'typeorm';

enum LANGUAGE_DEFAULT {
  EN = 'en',
  ES = 'es',
}

@Entity()
export class UserEntity extends Base {
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
  partnerAccess?: PartnerAccessEntity;

  @OneToOne(() => PartnerAdminEntity, (partnerAdmin) => partnerAdmin.user, {
    eager: true,
  })
  partnerAdmin?: PartnerAdminEntity;
}
