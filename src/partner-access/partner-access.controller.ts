import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { isProduction } from 'src/utils/constants';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { PartnerAdminAuthGuard } from '../partner-admin/partner-admin-auth.guard';
import { SuperAdminAuthGuard } from '../partner-admin/super-admin-auth.guard';
import { GetUserDto } from '../user/dtos/get-user.dto';
import { ControllerDecorator } from '../utils/controller.decorator';
import { CreatePartnerAccessDto } from './dtos/create-partner-access.dto';
import { GetPartnerAccessesDto } from './dtos/get-partner-access.dto';
import { UpdatePartnerAccessDto } from './dtos/update-partner-access.dto';
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
  @Delete('/cypress')
  @UseGuards(SuperAdminAuthGuard)
  async deleteCypressAccessCode(): Promise<void> {
    if (!isProduction) {
      return await this.partnerAccessService.deleteCypressTestAccessCodes();
    }
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    description: 'Returns a list of partner access codes',
  })
  @UseGuards(SuperAdminAuthGuard)
  @Get()
  @ApiBody({ type: GetPartnerAccessesDto, required: false })
  async getPartnerAccessCodes(
    @Body() getPartnerAccessDto: GetPartnerAccessesDto | undefined,
  ): Promise<PartnerAccessEntity[]> {
    return this.partnerAccessService.getPartnerAccessCodes(getPartnerAccessDto);
  }

  // TODO - Not in use - leaving as the bones might be reused
  @ApiBearerAuth('access-token')
  @ApiOperation({
    description:
      'Returns a list of users with an access code and the number of therapy sessions available to them',
  })
  @UseGuards(SuperAdminAuthGuard)
  @Get('users')
  async getPartnerAccessCodesWithUsers(): Promise<PartnerAccessEntity[]> {
    return await this.partnerAccessService.getUserTherapySessions();
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    description: 'Updates number of therapy sessions available to an access code',
  })
  @Patch(':id')
  @ApiParam({ name: 'id', description: 'Updates partner access by id' })
  @UseGuards(SuperAdminAuthGuard)
  async updatePartnerAccess(@Param() { id }, @Body() updates: UpdatePartnerAccessDto) {
    return await this.partnerAccessService.updatePartnerAccess(id, updates);
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
