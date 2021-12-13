import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import { PartnerEntity } from 'src/entities/partner.entity';
import { ControllerDecorator } from '../utils/controller.decorator';
import { CreatePartnerDto } from './dtos/create-partner.dto';
import { PartnerService } from './partner.service';

@ApiTags('Partner')
@ControllerDecorator()
@Controller('/v1/partner')
export class PartnerController {
  constructor(private partnerService: PartnerService) {}

  @Post()
  @ApiBody({ type: CreatePartnerDto })
  async createPartner(
    @Body() createPartnerDto: CreatePartnerDto,
  ): Promise<PartnerEntity | unknown> {
    return this.partnerService.createPartner(createPartnerDto);
  }

  @Get()
  async fetchPartners(): Promise<PartnerEntity[]> {
    return this.partnerService.fetchPartners();
  }
}
