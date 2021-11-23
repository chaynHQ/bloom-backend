import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm/dist/common';
import { CreatePartnerAccessDto } from './dto/create-partner-access.dto';
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

  private async findPartnerAccessCode(accessCode: string): Promise<PartnerAccessEntity> {
    return await this.partnerAccessRepository.findOne({ accessCode });
  }

  private async generateAccessCode(length: number): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890';
    const accessCode = _.sampleSize(chars, length || 6).join('');
    if (!!(await this.findPartnerAccessCode(accessCode))) {
      this.generateAccessCode(6);
    }
    return accessCode;
  }

  private async checkCodeStatus(partnerAccessCode: string): Promise<PartnerAccessCodeStatusEnum> {
    const format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

    if (format.test(partnerAccessCode) || partnerAccessCode.length !== 6) {
      throw new HttpException(PartnerAccessCodeStatusEnum.INVALID_CODE, HttpStatus.BAD_REQUEST);
    }

    const codeDetails = await this.findPartnerAccessCode(partnerAccessCode);

    if (codeDetails === undefined) {
      throw new HttpException(PartnerAccessCodeStatusEnum.DOES_NOT_EXIST, HttpStatus.BAD_REQUEST);
    }

    if (!!codeDetails.userId) {
      throw new HttpException(PartnerAccessCodeStatusEnum.ALREADY_IN_USE, HttpStatus.CONFLICT);
    }

    if (moment(codeDetails.createdAt).add(1, 'year').isSameOrBefore(Date.now())) {
      throw new HttpException(PartnerAccessCodeStatusEnum.CODE_EXPIRED, HttpStatus.BAD_REQUEST);
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

  async updatePartnerAccessCode(
    partnerAccessCode: string,
    userId: string,
  ): Promise<PartnerAccessEntity> {
    await this.checkCodeStatus(partnerAccessCode);

    const partnerAccessCodeDetails = await this.findPartnerAccessCode(partnerAccessCode);

    const partnerAccessCodeUpdateDetails = {
      userId,
      activatedAt: moment(Date.now()).format('YYYY-MM-DD hh:mm:ss'),
    };

    try {
      return await this.partnerAccessRepository.save({
        ...partnerAccessCodeDetails,
        ...partnerAccessCodeUpdateDetails,
      });
    } catch (error) {
      return error;
    }
  }
}
