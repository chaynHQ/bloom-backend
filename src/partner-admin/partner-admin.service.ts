import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerAdminEntity } from '../entities/partner-admin.entity';
import { CreatePartnerAdminDto } from './dtos/create-partner-admin.dto';
import { PartnerAdminRepository } from './partner-admin.repository';

@Injectable()
export class PartnerAdminService {
  constructor(
    @InjectRepository(PartnerAdminRepository)
    private partnerAdminRepository: PartnerAdminRepository,
  ) {}

  async createPartnerAdmin(
    createPartnerAdminDto: CreatePartnerAdminDto,
  ): Promise<PartnerAdminEntity | unknown> {
    try {
      const createPartnerAdminObject = this.partnerAdminRepository.create(createPartnerAdminDto);
      return await this.partnerAdminRepository.save(createPartnerAdminObject);
    } catch (error) {
      if (error.code === '23505') {
        throw new HttpException(error.detail, HttpStatus.BAD_REQUEST);
      }
      return error;
    }
  }
}
