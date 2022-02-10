import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerRepository } from 'src/partner/partner.repository';
import { PartnerService } from 'src/partner/partner.service';
import { CoursePartnerRepository } from './course-partner.repository';

@Module({
  imports: [TypeOrmModule.forFeature([CoursePartnerRepository, PartnerRepository])],
  providers: [PartnerService],
})
export class CoursePartnerModule {}
