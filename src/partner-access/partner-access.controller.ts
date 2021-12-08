import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { CreatePartnerAccessDto } from './dtos/create-partner-access.dto';
import { PartnerAccessService } from './partner-access.service';
import { PartnerAdminAuthGuard } from '../partner-admin/partner-admin-auth.guard';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { ValidatePartnerAccessCodeDto } from './dtos/validate-partner-access.dto';
import { PartnerAccessCodeStatusEnum } from '../utils/constants';
import { SimplybookBodyDto } from './dtos/zapier-body.dto';
import { ZapierAuthGuard } from './zapier-auth.guard';
import { ControllerDecorator } from '../utils/controller.decorator';

@ApiTags('Partner Access')
@ControllerDecorator()
@Controller('/v1/partner-access')
export class PartnerAccessController {
  constructor(private readonly partnerAccessService: PartnerAccessService) {}

  @ApiBearerAuth()
  @UseGuards(PartnerAdminAuthGuard)
  @Post()
  @ApiBody({ type: CreatePartnerAccessDto })
  async generatePartnerAccess(
    @Body() createPartnerAccessDto: CreatePartnerAccessDto,
    @Req() req: Request,
  ): Promise<PartnerAccessEntity> {
    return await this.partnerAccessService.createPartnerAccess(
      createPartnerAccessDto,
      req['partnerId'],
      req['partnerAdminId'],
    );
  }

  @Post('validate-code')
  @ApiBody({ type: ValidatePartnerAccessCodeDto })
  async validatePartnerAccessCode(
    @Body() { partnerAccessCode }: ValidatePartnerAccessCodeDto,
  ): Promise<{ status: PartnerAccessCodeStatusEnum }> {
    return this.partnerAccessService.validatePartnerAccessCode(partnerAccessCode.toUpperCase());
  }

  @UseGuards(ZapierAuthGuard)
  @Post('webhooks/simplybook')
  @ApiBody({ type: SimplybookBodyDto })
  async updatePartnerAccessBooking(@Body() simplybookBodyDto: SimplybookBodyDto): Promise<string> {
    return this.partnerAccessService.updatePartnerAccessBooking(simplybookBodyDto);
  }
}
