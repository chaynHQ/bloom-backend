import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerAccessRepository } from 'src/partner-access/partner-access.repository';
import { PartnerAdminRepository } from 'src/partner-admin/partner-admin.repository';
import { PartnerRepository } from 'src/partner/partner.repository';
import { PartnerService } from 'src/partner/partner.service';
import { UserRepository } from 'src/user/user.repository';
import { CoursePartnerRepository } from './course-partner.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CoursePartnerRepository,
      PartnerRepository,
      PartnerAccessRepository,
      PartnerAdminRepository,
      UserRepository,
    ]),
  ],
  providers: [PartnerService],
})
export class CoursePartnerModule {}
