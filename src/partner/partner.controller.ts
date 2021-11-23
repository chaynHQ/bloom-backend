import { Body, Controller, Post } from '@nestjs/common';
import { CreatePartnerDto } from './dtos/create-partner.dto';
import { PartnerService } from './partner.service';

@Controller('partner')
export class PartnerController {
  constructor(private partnerService: PartnerService) {}

  @Post()
  async createPartner(@Body() createPartnerDto: CreatePartnerDto) {
    return this.partnerService.createPartner(createPartnerDto);
  }
}
