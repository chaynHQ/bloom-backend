import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { FeatureEntity } from 'src/entities/feature.entity';
import { SuperAdminAuthGuard } from '../partner-admin/super-admin-auth.guard';
import { ControllerDecorator } from '../utils/controller.decorator';
import { CreateFeatureDto } from './dtos/create-feature.dto';
import { FeatureService } from './feature.service';

@ApiTags('Feature')
@ControllerDecorator()
@Controller('/v1/feature')
export class FeatureController {
  constructor(private featureService: FeatureService) {}

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ description: 'Creates feature' })
  @UseGuards(SuperAdminAuthGuard)
  async createFeature(
    @Body() createFeatureDto: CreateFeatureDto,
  ): Promise<FeatureEntity | unknown> {
    console.log('im inside create feature');
    return this.featureService.createFeature(createFeatureDto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ description: 'Returns profile data for all Features' })
  @UseGuards(SuperAdminAuthGuard)
  @Get()
  async getFeatures(): Promise<FeatureEntity[]> {
    return this.featureService.getFeatures();
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ description: 'Returns feature' })
  @ApiParam({ name: 'id', description: 'Gets feature by id' })
  async getFeature(@Param() { id }): Promise<FeatureEntity> {
    return this.featureService.getFeature(id);
  }
}
