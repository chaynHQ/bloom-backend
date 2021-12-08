import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerEntity } from '../entities/partner.entity';
import { CreatePartnerDto } from './dtos/create-partner.dto';
import { PartnerRepository } from './partner.repository';

@Injectable()
export class PartnerService {
  constructor(@InjectRepository(PartnerRepository) private partnerRepository: PartnerRepository) {}

  async createPartner(createPartnerDto: CreatePartnerDto): Promise<PartnerEntity | unknown> {
    try {
      const partnerObject = this.partnerRepository.create(createPartnerDto);
      return await this.partnerRepository.save(partnerObject);
    } catch (error) {
      if (error.code === '23505') {
        throw new HttpException(error.detail, HttpStatus.BAD_REQUEST);
      }
      return error;
    }
  }

  async fetchPartners(): Promise<PartnerEntity[]> {
    return await this.partnerRepository.find();
  }
}
