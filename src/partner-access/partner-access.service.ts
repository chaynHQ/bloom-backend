import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm/dist/common';
import { PartnerAdminRepository } from 'src/partner-admin/partner-admin.repository';
import { PartnerRepository } from 'src/partner/partner.repository';
import { CreateAccessCodeDto } from './dto/create-access-code.dto';
import { PartnerAccessRepository } from './partner-access.repository';
import _ from 'lodash';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';

@Injectable()
export class PartnerAccessService {
  constructor(
    @InjectRepository(PartnerAccessRepository)
    private partnerAccessRepository: PartnerAccessRepository,
    @InjectRepository(PartnerRepository)
    private partnerRepository: PartnerRepository,
    @InjectRepository(PartnerAdminRepository)
    private partnerAdminRepository: PartnerAdminRepository,
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

  async createPartnerAccessCode(
    createAccessCodeDto: CreateAccessCodeDto,
    partnerId: string,
    partnerAdminId: string,
  ): Promise<PartnerAccessEntity> {
    const accessCodeDetails = this.partnerAccessRepository.create(createAccessCodeDto);
    accessCodeDetails.partnerAdminId = partnerAdminId;
    accessCodeDetails.partnerId = partnerId;
    accessCodeDetails.accessCode = await this.generateAccessCode(6);

    return await this.partnerAccessRepository.save(accessCodeDetails);
  }
}
