import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SuperAdminAuthGuard } from 'src/partner-admin/super-admin-auth.guard';
import { ControllerDecorator } from 'src/utils/controller.decorator';
import { CreatePartnerFeatureDto } from './dtos/create-partner-feature.dto';
import { UpdatePartnerFeatureDto } from './dtos/update-partner-feature.dto';
import { PartnerFeatureService } from './partner-feature.service';

@ApiTags('Partner Feature')
@ControllerDecorator()
@Controller('/v1/partner-feature')
export class PartnerFeatureController {
  constructor(private readonly partnerFeatureService: PartnerFeatureService) {}

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    description: 'Stores relationship between a `Partner` and `Feature` records.',
  })
  @UseGuards(SuperAdminAuthGuard)
  async createPartnerFeature(@Body() createPartnerFeatureDto: CreatePartnerFeatureDto) {
    return await this.partnerFeatureService.createPartnerFeature(createPartnerFeatureDto);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    description: 'Updates relationship between a `Partner` and `Feature` records.',
  })
  @ApiParam({ name: 'id', description: 'Updates partner feature by id' })
  @UseGuards(SuperAdminAuthGuard)
  async updatePartnerFeature(
    @Param() { id },
    @Body() updatePartnerFeatureDto: UpdatePartnerFeatureDto,
  ) {
    return await this.partnerFeatureService.updatePartnerFeature(id, updatePartnerFeatureDto);
  }
  }
}
