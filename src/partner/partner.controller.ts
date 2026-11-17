import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { formatPartnerObject } from 'src/utils/serialize';
import { SuperAdminAuthGuard } from '../partner-admin/super-admin-auth.guard';
import { ControllerDecorator } from '../utils/controller.decorator';
import { ActivePartnerDto, GetPartnerAdminViewDto, GetPartnerDto } from './dtos/get-partner.dto';
import { PartnerIdParamDto, PartnerParamDto } from './dtos/partner-param.dto';
import { UpdatePartnerDto } from './dtos/update-partner.dto';
import { PartnerService } from './partner.service';

@ApiTags('Partner')
@ControllerDecorator()
@Controller('/v1/partner')
export class PartnerController {
  constructor(private partnerService: PartnerService) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({ description: 'Returns profile data for all partners' })
  @UseGuards(SuperAdminAuthGuard)
  @Get()
  async getPartners(): Promise<GetPartnerAdminViewDto[]> {
    return this.partnerService.getPartners();
  }

  // Declared before GET :name so "active" isn't read as a partner name
  @Get('active')
  @ApiOperation({
    description: 'Returns the id, name, slug and parentId of active partners (public)',
  })
  async getActivePartners(): Promise<ActivePartnerDto[]> {
    return this.partnerService.getActivePartners();
  }

  @Get(':name')
  @ApiOperation({ description: 'Returns profile data for a partner (public endpoint)' })
  @ApiParam({ name: 'name', description: 'Gets partner by name or slug' })
  async getPartner(@Param() params: PartnerParamDto): Promise<GetPartnerDto> {
    const partnerResponse = await this.partnerService.getPartnerWithPartnerFeaturesByName(
      params.name,
    );
    return formatPartnerObject(partnerResponse);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(SuperAdminAuthGuard)
  @Patch(':id')
  @ApiOperation({
    description:
      'Updates a partner: active status (cascades to partner admins and accesses only when it changes), therapy sessions per code, automatic access code, parent partner',
  })
  @ApiBody({ type: UpdatePartnerDto })
  async updatePartnerActiveStatus(
    @Param() params: PartnerIdParamDto,
    @Body() updatePartnerDto: UpdatePartnerDto,
  ) {
    return this.partnerService.updatePartnerActiveStatus(params.id, updatePartnerDto);
  }
}
