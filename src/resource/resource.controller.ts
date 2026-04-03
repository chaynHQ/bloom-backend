import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SuperAdminAuthGuard } from 'src/partner-admin/super-admin-auth.guard';
import { ControllerDecorator } from 'src/utils/controller.decorator';
import { CreateResourceDto } from './dtos/create-resource.dto';
import { ResourceService } from './resource.service';

@ApiTags('Resources')
@ControllerDecorator()
@Controller('/v1/resource')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Get(':id')
  async getResource(@Param('id') id: string) {
    return this.resourceService.findOne(id);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ description: 'Creates resource' })
  @UseGuards(SuperAdminAuthGuard)
  async createResource(@Body() createResourceDto: CreateResourceDto) {
    return this.resourceService.create(createResourceDto);
  }
}
