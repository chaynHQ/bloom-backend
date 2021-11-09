import { Body, Controller, Post } from '@nestjs/common';
import { ApiConsumes, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateAccessCodeDto } from './dto/create-access-code.dto';
import { PartnerAccessService } from './partner-access.service';
import { IPartnerAccess } from './partner-access.model';

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
  constructor(private readonly partnerAccessService: PartnerAccessService) {
    this.partnerAccessService = partnerAccessService;
  }

  @Post('generate')
  async generatePartnerAccessCode(
    @Body() createAccessCodeDto: CreateAccessCodeDto,
  ): Promise<IPartnerAccess> {
    return await this.partnerAccessService.createPartnerAccessCode(createAccessCodeDto);
  }
}
