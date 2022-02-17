import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm/dist/common';
import _ from 'lodash';
import moment from 'moment';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { GetUserDto } from '../user/dtos/get-user.dto';
import { PartnerAccessCodeStatusEnum } from '../utils/constants';
import { CreatePartnerAccessDto } from './dtos/create-partner-access.dto';
import { PartnerAccessRepository } from './partner-access.repository';

@Injectable()
export class PartnerAccessService {
  constructor(
    @InjectRepository(PartnerAccessRepository)
    private partnerAccessRepository: PartnerAccessRepository,
  ) {}

  private async findPartnerAccessCode(accessCode: string): Promise<PartnerAccessEntity> {
    return await this.partnerAccessRepository
      .createQueryBuilder('partnerAccess')
      .leftJoinAndSelect('partnerAccess.partner', 'partner')
      .where('partnerAccess.accessCode = :accessCode', { accessCode })
      .getOne();
  }

  private async generateAccessCode(length: number): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890';
    const accessCode = _.sampleSize(chars, length || 6).join('');
    if (!!(await this.findPartnerAccessCode(accessCode))) {
      this.generateAccessCode(6);
    }
    return accessCode;
  }

  private async getValidPartnerAccessCode(partnerAccessCode: string): Promise<PartnerAccessEntity> {
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

    return codeDetails;
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
    await this.getValidPartnerAccessCode(partnerAccessCode);
    return {
      status: PartnerAccessCodeStatusEnum.VALID,
    };
  }

  async updatePartnerAccessCodeUser(
    partnerAccessCode: string,
    userId: string,
  ): Promise<PartnerAccessEntity> {
    const partnerAccessCodeDetails = await this.getValidPartnerAccessCode(partnerAccessCode);

    partnerAccessCodeDetails.userId = userId;
    partnerAccessCodeDetails.activatedAt = new Date();
    return await this.partnerAccessRepository.save(partnerAccessCodeDetails);
  }

  async getPartnerAccessCodes(): Promise<PartnerAccessEntity[]> {
    return await this.partnerAccessRepository
      .createQueryBuilder('partnerAccess')
      .leftJoinAndSelect('partnerAccess.partner', 'partner')
      .getMany();
  }

  async assignPartnerAccess(
    { user, partnerAccesses }: GetUserDto,
    partnerAccessCode: string,
  ): Promise<PartnerAccessEntity> {
    const partnerAccessCodeDetails = await this.getValidPartnerAccessCode(partnerAccessCode);

    partnerAccesses.map(async (pa) => {
      if (partnerAccessCodeDetails.partner.id === pa.partner.id && pa.active === true) {
        pa.active = false;
        await this.partnerAccessRepository.save(pa);
      }
    });

    partnerAccessCodeDetails.userId = user.id;
    partnerAccessCodeDetails.activatedAt = new Date();

    await this.partnerAccessRepository.save(partnerAccessCodeDetails);

    return partnerAccessCodeDetails;
  }
}
