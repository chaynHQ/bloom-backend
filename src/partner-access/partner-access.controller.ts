import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreatePartnerAccessDto } from './dto/create-partner-access.dto';
import { PartnerAccessService } from './partner-access.service';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';

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
  @ApiBody({ type: CreatePartnerAccessDto })
  async generatePartnerAccess(
    @Body() createPartnerAccessDto: CreatePartnerAccessDto,
  ): Promise<PartnerAccessEntity> {
    return await this.partnerAccessService.createPartnerAccess(
      createPartnerAccessDto,
      '4bb986f2-9208-4da0-b1c6-9899838a8558',
      '64870e3b-7144-4cf9-99a5-fb2b6deea5f3',
    );
  }
}
