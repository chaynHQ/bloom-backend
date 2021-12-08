import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiConsumes,
  ApiProduces,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PartnerEntity } from '../entities/partner.entity';
import { SuperAdminAuthGuard } from '../partner-admin/super-admin-auth.guard';
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

  @ApiBearerAuth()
  @UseGuards(SuperAdminAuthGuard)
  @Post()
  @ApiBody({ type: CreatePartnerDto })
  async createPartner(
    @Body() createPartnerDto: CreatePartnerDto,
  ): Promise<PartnerEntity | unknown> {
    return this.partnerService.createPartner(createPartnerDto);
  }

  @ApiBearerAuth()
  @UseGuards(SuperAdminAuthGuard)
  @Get()
  async fetchPartners(): Promise<PartnerEntity[]> {
    return this.partnerService.fetchPartners();
  }
}
