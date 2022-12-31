import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PartnerAdminEntity } from '../entities/partner-admin.entity';
import { ControllerDecorator } from '../utils/controller.decorator';
import { CreatePartnerAdminUserDto } from './dtos/create-partner-admin-user.dto';
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
      'Makes an already existing team member a partner admin team member who uses the app to complete Bloom admin tasks such as creating new partner access codes',
  })
  @UseGuards(SuperAdminAuthGuard)
  @Post()
  @ApiBody({ type: CreatePartnerAdminDto })
  async createPartnerAdmin(
    @Body() createPartnerAdminDto: CreatePartnerAdminDto,
  ): Promise<PartnerAdminEntity | unknown> {
    return this.partnerAdminService.createPartnerAdmin(createPartnerAdminDto);
  }

  // TODO can we make this the generic post endpoint?
  @ApiBearerAuth('access-token')
  @ApiOperation({
    description:
      'Creates a user and partner team member who uses the app to complete Bloom admin tasks such as creating new partner access codes',
  })
  @UseGuards(SuperAdminAuthGuard)
  @Post('create-user')
  @ApiBody({ type: CreatePartnerAdminUserDto })
  async createPartnerAdminUser(
    @Body() createPartnerAdminUserDto: CreatePartnerAdminUserDto,
  ): Promise<PartnerAdminEntity | unknown> {
    return this.partnerAdminService.createPartnerAdminUser(createPartnerAdminUserDto);
  }
}
