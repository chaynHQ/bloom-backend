/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreatePartnerAccessDto } from './dto/create-partner-access.dto';
import { PartnerAccessService } from './partner-access.service';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { ValidatePartnerAccessCodeDto } from './dto/validate-partner-access.dto';

@ApiTags('Partner Access')
@ApiConsumes('application/json')
@ApiProduces('application/json')
@ApiResponse({ status: 201, description: 'The record has been successfully created.' })
@ApiResponse({ status: 400, description: 'Incorrect payload sent.' })
@ApiResponse({ status: 401, description: 'Unauthorized.' })
@ApiResponse({ status: 403, description: 'Forbidden.' })
@ApiResponse({ status: 500, description: 'Internal Server Error.' })
@Controller('/v1/partner-access')
export class PartnerAccessController {
  constructor(private readonly partnerAccessService: PartnerAccessService) {}

  @Post('generate')
  @ApiBody({ type: CreatePartnerAccessDto })
  async generatePartnerAccess(
    @Body() createPartnerAccessDto: CreatePartnerAccessDto,
    partnerId: string = '4bb986f2-9208-4da0-b1c6-9899838a8558',
    partnerAdminId: string = '64870e3b-7144-4cf9-99a5-fb2b6deea5f3',
  ): Promise<PartnerAccessEntity> {
    return await this.partnerAccessService.createPartnerAccess(
      createPartnerAccessDto,
      partnerId,
      partnerAdminId,
    );
  }

  @Post('validate-code')
  @ApiBody({ type: ValidatePartnerAccessCodeDto })
  async validateCode(
    @Body() { partnerAccessCode }: ValidatePartnerAccessCodeDto,
  ): Promise<boolean> {
    return this.partnerAccessService.validatePartnerAccessCode(partnerAccessCode);
  }
}
