import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PartnerAdminEntity } from '../entities/partner-admin.entity';
import { CreatePartnerAdminDto } from './dtos/create-partner-admin.dto';
import { PartnerAdminService } from './partner-admin.service';
import { SuperAdminAuthGuard } from './super-admin-auth.guard';

@ApiTags('Partner Admin')
@ApiConsumes('application/json')
@ApiProduces('application/json')
@ApiResponse({ status: 201, description: 'The record has been successfully created.' })
@ApiResponse({ status: 400, description: 'Incorrect payload sent.' })
@ApiResponse({ status: 401, description: 'Unauthorized.' })
@ApiResponse({ status: 403, description: 'Forbidden.' })
@ApiResponse({ status: 500, description: 'Internal Server Error.' })
@Controller('/v1/partner-admin')
export class PartnerAdminController {
  constructor(private partnerAdminService: PartnerAdminService) {}

  @ApiBearerAuth()
  @UseGuards(SuperAdminAuthGuard)
  @Post()
  @ApiBody({ type: CreatePartnerAdminDto })
  async createPartnerAdmin(
    @Body() createPartnerAdminDto: CreatePartnerAdminDto,
  ): Promise<PartnerAdminEntity | unknown> {
    return this.partnerAdminService.createPartnerAdmin(createPartnerAdminDto);
  }
}
