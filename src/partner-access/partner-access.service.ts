import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm/dist/common';
import { CreatePartnerAccessDto } from './dtos/create-partner-access.dto';
import { PartnerAccessRepository } from './partner-access.repository';
import _ from 'lodash';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { PartnerAccessCodeStatusEnum } from '../utils/constants';
import moment from 'moment';

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

  private async checkCodeStatus(partnerAccessCode: string): Promise<PartnerAccessCodeStatusEnum> {
    const format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

    if (format.test(partnerAccessCode) || partnerAccessCode.length !== 6) {
      return PartnerAccessCodeStatusEnum.INVALID_CODE;
    }

    const codeDetails = await this.partnerAccessRepository.findOne({
      accessCode: partnerAccessCode,
    });

    if (codeDetails === undefined) {
      return PartnerAccessCodeStatusEnum.DOES_NOT_EXIST;
    }

    if (!!codeDetails.userId) {
      return PartnerAccessCodeStatusEnum.ALREADY_IN_USE;
    }

    if (moment(codeDetails.createdAt).add(1, 'year').isSameOrBefore(Date.now())) {
      return PartnerAccessCodeStatusEnum.CODE_EXPIRED;
    }

    return PartnerAccessCodeStatusEnum.VALID;
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

  async validatePartnerAccessCode(
    partnerAccessCode: string,
  ): Promise<{ status: PartnerAccessCodeStatusEnum }> {
    const PartnerAccessCodeStatusEnum = await this.checkCodeStatus(partnerAccessCode);
    return {
      status: PartnerAccessCodeStatusEnum,
    };
  }
}
