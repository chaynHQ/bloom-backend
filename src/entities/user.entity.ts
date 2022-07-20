import { Column, Entity, Generated, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { PartnerAdminEntity } from '../entities/partner-admin.entity';
import { BaseEntity } from './base.entity';
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
  contactPermission!: boolean;

  @Column({ type: Boolean, default: false })
  isSuperAdmin: boolean;

  @Column({ type: Boolean, default: true })
  isActive: boolean;

  @OneToMany(() => PartnerAccessEntity, (partnerAccess) => partnerAccess.user)
  partnerAccess: PartnerAccessEntity[];

  @OneToOne(() => PartnerAdminEntity, (partnerAdmin) => partnerAdmin.user)
  partnerAdmin: PartnerAdminEntity;

  @OneToMany(() => CourseUserEntity, (courseUser) => courseUser.user)
  courseUser: CourseUserEntity[];

  @Column({ unique: true })
  @Generated('uuid')
  crispTokenId: string;
}
