import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiConsumes, ApiProduces, ApiResponse, ApiBody } from '@nestjs/swagger';
import { PartnerEntity } from 'src/entities/partner.entity';
import { CreatePartnerDto } from './dtos/create-partner.dto';
import { PartnerService } from './partner.service';

@ApiTags('Partner')
@ApiConsumes('application/json')
@ApiProduces('application/json')
@ApiResponse({ status: 201, description: 'The record has been successfully created.' })
@ApiResponse({ status: 400, description: 'Incorrect payload sent.' })
@ApiResponse({ status: 401, description: 'Unauthorized.' })
@ApiResponse({ status: 403, description: 'Forbidden.' })
@ApiResponse({ status: 500, description: 'Internal Server Error.' })
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
