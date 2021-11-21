import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm/dist/common';
import { CreatePartnerAccessDto } from './dto/create-partner-access.dto';
import { PartnerAccessRepository } from './partner-access.repository';
import _ from 'lodash';
import { PartnerAccessEntity } from '../entities/partner-access.entity';

@Injectable()
export class PartnerAccessService {
  constructor(
    @InjectRepository(PartnerAccessRepository)
    private partnerAccessRepository: PartnerAccessRepository,
  ) {}

  private async accessCodeCheck(accessCode: string): Promise<boolean> {
    const codeExists = await this.partnerAccessRepository.findOne({ accessCode });
    return !!codeExists;
  }

  private async generateAccessCode(length: number): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890';
    const accessCode = _.sampleSize(chars, length || 6).join('');
    if (await this.accessCodeCheck(accessCode)) {
      this.generateAccessCode(6);
    }
    return accessCode;
  }

  async createPartnerAccess(
    createPartnerAccessDto: CreatePartnerAccessDto,
    partnerId: string,
    partnerAdminId: string,
  ): Promise<PartnerAccessEntity> {
    const partnerAccessDetails = this.partnerAccessRepository.create(createPartnerAccessDto);
    partnerAccessDetails.partnerAdminId = partnerAdminId;
    partnerAccessDetails.partnerId = partnerId;
    partnerAccessDetails.accessCode = await this.generateAccessCode(6);

    return await this.partnerAccessRepository.save(partnerAccessDetails);
  }
}
