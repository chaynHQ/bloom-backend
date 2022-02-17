import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { FirebaseAuthGuard } from 'src/firebase/firebase-auth.guard';
import { GetUserDto } from 'src/user/dtos/get-user.dto';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { PartnerAdminAuthGuard } from '../partner-admin/partner-admin-auth.guard';
import { SuperAdminAuthGuard } from '../partner-admin/super-admin-auth.guard';
import { PartnerAccessCodeStatusEnum } from '../utils/constants';
import { ControllerDecorator } from '../utils/controller.decorator';
import { CreatePartnerAccessDto } from './dtos/create-partner-access.dto';
import { ValidatePartnerAccessCodeDto } from './dtos/validate-partner-access.dto';
import { PartnerAccessService } from './partner-access.service';

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

  @ApiBearerAuth()
  @UseGuards(SuperAdminAuthGuard)
  @Get()
  async getPartnerAccessCodes(): Promise<PartnerAccessEntity[]> {
    return this.partnerAccessService.getPartnerAccessCodes();
  }

  @Post('validate-code')
  @ApiBody({ type: ValidatePartnerAccessCodeDto })
  async validatePartnerAccessCode(
    @Body() { partnerAccessCode }: ValidatePartnerAccessCodeDto,
  ): Promise<{ status: PartnerAccessCodeStatusEnum }> {
    return this.partnerAccessService.validatePartnerAccessCode(partnerAccessCode.toUpperCase());
  }

  @ApiBearerAuth()
  @Post('assign')
  @UseGuards(FirebaseAuthGuard)
  @ApiBody({ type: ValidatePartnerAccessCodeDto })
  assignPartnerAccess(
    @Req() req: Request,
    @Body() { partnerAccessCode }: ValidatePartnerAccessCodeDto,
  ): Promise<PartnerAccessEntity> {
    return this.partnerAccessService.assignPartnerAccess(
      req['user'] as GetUserDto,
      partnerAccessCode,
    );
  }
}
