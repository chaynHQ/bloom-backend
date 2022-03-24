import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PartnerAdminEntity } from '../entities/partner-admin.entity';
import { ControllerDecorator } from '../utils/controller.decorator';
import { CreatePartnerAdminDto } from './dtos/create-partner-admin.dto';
import { PartnerAdminService } from './partner-admin.service';
import { SuperAdminAuthGuard } from './super-admin-auth.guard';

@ApiTags('Partner Admin')
@ControllerDecorator()
@Controller('/v1/partner-admin')
export class PartnerAdminController {
  constructor(private partnerAdminService: PartnerAdminService) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({
    description:
      'Creates a partner team member who uses the app to complete Bloom admin tasks such as creating new partner access codes',
  })
  @UseGuards(SuperAdminAuthGuard)
  @Post()
  @ApiBody({ type: CreatePartnerAdminDto })
  async createPartnerAdmin(
    @Body() createPartnerAdminDto: CreatePartnerAdminDto,
  ): Promise<PartnerAdminEntity | unknown> {
    return this.partnerAdminService.createPartnerAdmin(createPartnerAdminDto);
  }
}
