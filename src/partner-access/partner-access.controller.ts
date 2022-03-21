import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { PartnerAdminAuthGuard } from '../partner-admin/partner-admin-auth.guard';
import { SuperAdminAuthGuard } from '../partner-admin/super-admin-auth.guard';
import { GetUserDto } from '../user/dtos/get-user.dto';
import { ControllerDecorator } from '../utils/controller.decorator';
import { CreatePartnerAccessDto } from './dtos/create-partner-access.dto';
import { ValidatePartnerAccessCodeDto } from './dtos/validate-partner-access.dto';
import { PartnerAccessService } from './partner-access.service';

@ApiTags('Partner Access')
@ControllerDecorator()
@Controller('/v1/partner-access')
export class PartnerAccessController {
  constructor(private readonly partnerAccessService: PartnerAccessService) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({
    description:
      'Creates an unassigned partner access record, with a unique code that will be shared with the user to register with. The payload sets the features enabled for this partner access / future user.',
  })
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

  @ApiBearerAuth('access-token')
  @ApiOperation({
    description: 'Returns a list of partner access codes',
  })
  @UseGuards(SuperAdminAuthGuard)
  @Get()
  async getPartnerAccessCodes(): Promise<PartnerAccessEntity[]> {
    return this.partnerAccessService.getPartnerAccessCodes();
  }

  @Post('validate-code')
  @ApiOperation({
    description: 'Validates a partner access code',
  })
  @ApiBody({ type: ValidatePartnerAccessCodeDto })
  async validatePartnerAccessCode(
    @Body() { partnerAccessCode }: ValidatePartnerAccessCodeDto,
  ): Promise<PartnerAccessEntity> {
    return this.partnerAccessService.getValidPartnerAccessCode(partnerAccessCode.toUpperCase());
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    description: 'Assigns a partner access code to a user, granting them access to extra featuress',
  })
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
