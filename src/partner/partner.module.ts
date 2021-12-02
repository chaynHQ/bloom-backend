import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerController } from './partner.controller';
import { PartnerRepository } from './partner.repository';
import { PartnerService } from './partner.service';

@Module({
  imports: [TypeOrmModule.forFeature([PartnerRepository])],
  controllers: [PartnerController],
  providers: [PartnerService],
})
export class PartnerModule {}
