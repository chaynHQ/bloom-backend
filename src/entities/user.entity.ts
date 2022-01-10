import { PartnerAdminEntity } from '../entities/partner-admin.entity';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { Column, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { LANGUAGE_DEFAULT } from '../utils/constants';
import { CourseUserEntity } from './course-user.entity';

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

  @Column()
  contactPermission!: boolean;

  @Column({ type: Boolean, default: false })
  isSuperAdmin: boolean;

  @OneToMany(() => PartnerAccessEntity, (partnerAccess) => partnerAccess.user)
  partnerAccess: PartnerAccessEntity[];

  @OneToMany(() => PartnerAdminEntity, (partnerAdmin) => partnerAdmin.user)
  partnerAdmin: PartnerAdminEntity[];

  @OneToMany(() => CourseUserEntity, (courseUser) => courseUser.user)
  courseUser: CourseUserEntity[];
}
