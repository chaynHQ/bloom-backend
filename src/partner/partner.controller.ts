import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { PartnerEntity } from '../entities/partner.entity';
import { SuperAdminAuthGuard } from '../partner-admin/super-admin-auth.guard';
import { ControllerDecorator } from '../utils/controller.decorator';
import { CreatePartnerDto } from './dtos/create-partner.dto';
import { DeletePartnerDto } from './dtos/delete-partner.dto';
import { PartnerService } from './partner.service';

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
  @ApiOperation({ description: 'Retuns profile data for all partners' })
  @UseGuards(SuperAdminAuthGuard)
  @Get()
  async getPartners(): Promise<PartnerEntity[]> {
    return this.partnerService.getPartners();
  }

  @Get(':name')
  @ApiOperation({ description: 'Retuns profile data for a partner' })
  @ApiParam({ name: 'name', description: 'Gets partner by name' })
  async getPartner(@Param() { name }): Promise<PartnerEntity> {
    return this.partnerService.getPartner(name);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(SuperAdminAuthGuard)
  @Post('delete')
  @ApiOperation({ description: 'Deletes a partner profile and makes partnerAccess inactive' })
  @ApiBody({ type: DeletePartnerDto })
  async deletePartner(@Body() deletePartnerDto: DeletePartnerDto) {
    return this.partnerService.deletePartner(deletePartnerDto);
  }
}
