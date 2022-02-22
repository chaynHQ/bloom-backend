import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm/dist/common';
import _ from 'lodash';
import moment from 'moment';
import { updateCrispProfileAccess } from '../api/crisp/crisp-api';
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

  private async generateAccessCode(length: number): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890';
    const accessCode = _.sampleSize(chars, length || 6).join('');
    if (!!(await this.findPartnerAccessByCode(accessCode))) {
      this.generateAccessCode(6);
    }
    return accessCode;
  }

  private async findPartnerAccessByCode(accessCode: string): Promise<PartnerAccessEntity> {
    return await this.partnerAccessRepository
      .createQueryBuilder('partnerAccess')
      .leftJoinAndSelect('partnerAccess.partner', 'partner')
      .where('partnerAccess.accessCode = :accessCode', { accessCode })
      .getOne();
  }

  private async getValidPartnerAccessCode(partnerAccessCode: string): Promise<PartnerAccessEntity> {
    const format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

    if (format.test(partnerAccessCode) || partnerAccessCode.length !== 6) {
      throw new HttpException(PartnerAccessCodeStatusEnum.INVALID_CODE, HttpStatus.BAD_REQUEST);
    }

    const partnerAccess = await this.findPartnerAccessByCode(partnerAccessCode);

    if (partnerAccess === undefined) {
      throw new HttpException(PartnerAccessCodeStatusEnum.DOES_NOT_EXIST, HttpStatus.BAD_REQUEST);
    }

    if (!!partnerAccess.userId) {
      throw new HttpException(PartnerAccessCodeStatusEnum.ALREADY_IN_USE, HttpStatus.CONFLICT);
    }

    if (moment(partnerAccess.createdAt).add(1, 'year').isSameOrBefore(Date.now())) {
      throw new HttpException(PartnerAccessCodeStatusEnum.CODE_EXPIRED, HttpStatus.BAD_REQUEST);
    }

    return partnerAccess;
  }

  async validatePartnerAccessCode(
    partnerAccessCode: string,
  ): Promise<{ status: PartnerAccessCodeStatusEnum }> {
    await this.getValidPartnerAccessCode(partnerAccessCode);
    return {
      status: PartnerAccessCodeStatusEnum.VALID,
    };
  }

  async getPartnerAccessCodes(): Promise<PartnerAccessEntity[]> {
    return await this.partnerAccessRepository
      .createQueryBuilder('partnerAccess')
      .leftJoinAndSelect('partnerAccess.partner', 'partner')
      .getMany();
  }

  async assignPartnerAccessOnSignup(
    partnerAccessCode: string,
    userId: string,
  ): Promise<PartnerAccessEntity> {
    const partnerAccess = await this.getValidPartnerAccessCode(partnerAccessCode);

    partnerAccess.userId = userId;
    partnerAccess.activatedAt = new Date();
    return await this.partnerAccessRepository.save(partnerAccess);
  }

  async assignPartnerAccess(
    { user, partnerAccesses }: GetUserDto,
    partnerAccessCode: string,
  ): Promise<PartnerAccessEntity> {
    let totalTherapySessionsRemaining = 0;
    let totalTherapySessionsRedeemed = 0;

    const partnerAccess = await this.getValidPartnerAccessCode(partnerAccessCode);

    partnerAccesses.map(async (pa) => {
      if (partnerAccess.partner.id === pa.partner.id && pa.active === true) {
        pa.active = false;
        await this.partnerAccessRepository.save(pa);
      } else {
        totalTherapySessionsRemaining = totalTherapySessionsRemaining + pa.therapySessionsRemaining;
        totalTherapySessionsRedeemed = totalTherapySessionsRedeemed + pa.therapySessionsRedeemed;
      }
    });

    partnerAccess.userId = user.id;
    partnerAccess.activatedAt = new Date();

    await this.partnerAccessRepository.save(partnerAccess);

    if (!!partnerAccess.featureLiveChat) {
      await updateCrispProfileAccess(
        user.email,
        partnerAccess,
        totalTherapySessionsRedeemed,
        totalTherapySessionsRemaining,
      );
    }

    return partnerAccess;
  }
}
