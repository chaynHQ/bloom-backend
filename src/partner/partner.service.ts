import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerEntity } from 'src/entities/partner.entity';
import { CreatePartnerDto } from './dtos/create-partner.dto';
import { PartnerRepository } from './partner.repository';

@Injectable()
export class PartnerService {
  constructor(@InjectRepository(PartnerRepository) private partnerRepository: PartnerRepository) {}

  async createPartner(createPartnerDto: CreatePartnerDto): Promise<PartnerEntity> {
    const partnerObject = this.partnerRepository.create(createPartnerDto);
    return await this.partnerRepository.save(partnerObject);
  }
}
