import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm/dist/common';
import _ from 'lodash';
import moment from 'moment';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { PartnerAccessCodeStatusEnum } from '../utils/constants';
import { CreatePartnerAccessDto } from './dtos/create-partner-access.dto';
import { PartnerAccessRepository } from './partner-access.repository';

@Injectable()
export class PartnerAccessService {
  constructor(
    @InjectRepository(PartnerAccessRepository)
    private partnerAccessRepository: PartnerAccessRepository,
  ) {}

  private async getPartnerAccessByCode(accessCode: string): Promise<PartnerAccessEntity> {
    return await this.partnerAccessRepository.findOne({ accessCode });
  }

  private async generateAccessCode(length: number): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890';
    const accessCode = _.sampleSize(chars, length || 6).join('');
    if (!!(await this.getPartnerAccessByCode(accessCode))) {
      this.generateAccessCode(6);
    }
    return accessCode;
  }

  private async checkCodeStatus(partnerAccessCode: string): Promise<PartnerAccessCodeStatusEnum> {
    const format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

    if (format.test(partnerAccessCode) || partnerAccessCode.length !== 6) {
      throw new HttpException(PartnerAccessCodeStatusEnum.INVALID_CODE, HttpStatus.BAD_REQUEST);
    }

    const partnerAccess = await this.getPartnerAccessByCode(partnerAccessCode);

    if (partnerAccess === undefined) {
      throw new HttpException(PartnerAccessCodeStatusEnum.DOES_NOT_EXIST, HttpStatus.BAD_REQUEST);
    }

    if (!!partnerAccess.userId) {
      throw new HttpException(PartnerAccessCodeStatusEnum.ALREADY_IN_USE, HttpStatus.CONFLICT);
    }

    if (moment(partnerAccess.createdAt).add(1, 'year').isSameOrBefore(Date.now())) {
      throw new HttpException(PartnerAccessCodeStatusEnum.CODE_EXPIRED, HttpStatus.BAD_REQUEST);
    }

    return PartnerAccessCodeStatusEnum.VALID;
  }

  async createPartnerAccess(
    createPartnerAccessDto: CreatePartnerAccessDto,
    partnerId: string,
    partnerAdminId: string,
  ): Promise<PartnerAccessEntity> {
    const partnerAccess = this.partnerAccessRepository.create(createPartnerAccessDto);
    partnerAccess.partnerAdminId = partnerAdminId;
    partnerAccess.partnerId = partnerId;
    partnerAccess.accessCode = await this.generateAccessCode(6);

    return await this.partnerAccessRepository.save(partnerAccess);
  }

  async validatePartnerAccessCode(
    partnerAccessCode: string,
  ): Promise<{ status: PartnerAccessCodeStatusEnum }> {
    const PartnerAccessCodeStatusEnum = await this.checkCodeStatus(partnerAccessCode);
    return {
      status: PartnerAccessCodeStatusEnum,
    };
  }

  async updatePartnerAccessUser(
    partnerAccessCode: string,
    userId: string,
  ): Promise<PartnerAccessEntity> {
    await this.checkCodeStatus(partnerAccessCode);

    const partnerAccess = await this.getPartnerAccessByCode(partnerAccessCode);

    const updatedPartnerAccess = {
      userId,
      activatedAt: moment(Date.now()).format('YYYY-MM-DD hh:mm:ss'),
    };

    try {
      return await this.partnerAccessRepository.save({
        ...partnerAccess,
        ...updatedPartnerAccess,
      });
    } catch (error) {
      return error;
    }
  }

  async getPartnerAccessCodes(): Promise<PartnerAccessEntity[]> {
    return await this.partnerAccessRepository
      .createQueryBuilder('partnerAccess')
      .leftJoinAndSelect('partnerAccess.partner', 'partner')
      .getMany();
  }
}
