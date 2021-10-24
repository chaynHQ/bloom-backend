import { Base } from 'src/Base';
import { PartnerAccessEntity } from 'src/partnersAccess/partner.access.entity';
import { Column, Entity, OneToOne } from 'typeorm';

enum LANGUAGE_DEFAULT {
  ENG = 'ENGLISH',
  SPN = 'SPANISH',
}

@Entity()
export class UserEntity extends Base {
  @Column({ unique: true, nullable: false })
  firebaseUid: string;

  @Column({ nullable: false })
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true, nullable: false })
  email: string;

  @Column()
  languageDefault: LANGUAGE_DEFAULT;

  @OneToOne(() => PartnerAccessEntity, (partnerAccess) => partnerAccess.user, {
    eager: true,
  })
  partnerAccess: PartnerAccessEntity;
}
