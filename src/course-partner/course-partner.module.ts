import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursePartnerEntity } from 'src/entities/course-partner.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { UserEntity } from 'src/entities/user.entity';
import { PartnerService } from 'src/partner/partner.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CoursePartnerEntity,
      PartnerEntity,
      PartnerAccessEntity,
      PartnerAdminEntity,
      UserEntity,
    ]),
  ],
  providers: [PartnerService],
})
export class CoursePartnerModule {}
