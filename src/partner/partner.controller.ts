import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { PartnerEntity } from '../entities/partner.entity';
import { SuperAdminAuthGuard } from '../partner-admin/super-admin-auth.guard';
import { ControllerDecorator } from '../utils/controller.decorator';
import { CreatePartnerDto } from './dtos/create-partner.dto';
import { PartnerService } from './partner.service';

@ApiTags('Partner')
@ControllerDecorator()
@Controller('/v1/partner')
export class PartnerController {
  constructor(private partnerService: PartnerService) {}

  @ApiBearerAuth('access-token')
  @UseGuards(SuperAdminAuthGuard)
  @Post()
  @ApiBody({ type: CreatePartnerDto })
  async createPartner(
    @Body() createPartnerDto: CreatePartnerDto,
  ): Promise<PartnerEntity | unknown> {
    return this.partnerService.createPartner(createPartnerDto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(SuperAdminAuthGuard)
  @Get()
  async getPartners(): Promise<PartnerEntity[]> {
    return this.partnerService.getPartners();
  }

  @Get(':name')
  @ApiParam({ name: 'name', description: 'Gets partner by name' })
  async getPartner(@Param() { name }): Promise<PartnerEntity> {
    return this.partnerService.getPartner(name);
  }
}
