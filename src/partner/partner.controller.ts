import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { formatPartnerObject } from 'src/utils/serialize';
import { PartnerEntity } from '../entities/partner.entity';
import { SuperAdminAuthGuard } from '../partner-admin/super-admin-auth.guard';
import { ControllerDecorator } from '../utils/controller.decorator';
import { CreatePartnerDto } from './dtos/create-partner.dto';
import { IPartner } from './partner.interface';
import { PartnerService } from './partner.service';
import { UpdatePartnerDto } from './dtos/update-partner.dto';

@ApiTags('Partner')
@ControllerDecorator()
@Controller('/v1/partner')
export class PartnerController {
  constructor(private partnerService: PartnerService) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({ description: 'Creates basic profile data for a partner' })
  @UseGuards(SuperAdminAuthGuard)
  @Post()
  @ApiBody({ type: CreatePartnerDto })
  async createPartner(
    @Body() createPartnerDto: CreatePartnerDto,
  ): Promise<PartnerEntity | unknown> {
    return this.partnerService.createPartner(createPartnerDto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ description: 'Returns profile data for all partners' })
  @UseGuards(SuperAdminAuthGuard)
  @Get()
  async getPartners(): Promise<PartnerEntity[]> {
    return this.partnerService.getPartners();
  }

  @Get(':name')
  @ApiOperation({ description: 'Returns profile data for a partner' })
  @UseGuards(SuperAdminAuthGuard) // Temporary super admin auth guard
  @ApiParam({ name: 'name', description: 'Gets partner by name' })
  async getPartner(@Param() { name }): Promise<IPartner> {
    // annoyingly the frontend doesn't have the id when features are needed
    const partnerResponse = await this.partnerService.getPartnerWithPartnerFeaturesByName(name);
    return formatPartnerObject(partnerResponse);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(SuperAdminAuthGuard)
  @Patch(':id')
  @ApiOperation({ description: 'Update a partner profile and makes partner active or inactive' })
  @ApiBody({ type: UpdatePartnerDto })
  async updatePartner(
    @Param() { id },
    @Body() updatePartnerDto: UpdatePartnerDto,
  ) {
    return this.partnerService.updatePartner(id, updatePartnerDto);
  }
}
