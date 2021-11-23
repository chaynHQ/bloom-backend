import { Body, Controller, Post } from '@nestjs/common';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { CreatePartnerAdminDto } from './dtos/create-partner-admin.dto';
import { PartnerAdminService } from './partner-admin.service';

@Controller('/v1/partner-admin')
export class PartnerAdminController {
  constructor(private partnerAdminService: PartnerAdminService) {}

  @Post()
  async createPartnerAdmin(
    @Body() createPartnerAdminDto: CreatePartnerAdminDto,
  ): Promise<PartnerAdminEntity | unknown> {
    return this.partnerAdminService.createPartnerAdmin(createPartnerAdminDto);
  }
}
