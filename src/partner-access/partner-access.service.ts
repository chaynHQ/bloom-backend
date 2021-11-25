import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm/dist/common';
import { CreatePartnerAccessDto } from './dtos/create-partner-access.dto';
import { PartnerAccessRepository } from './partner-access.repository';
import _ from 'lodash';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { PartnerAccessCodeStatusEnum, ZAPIER_ACTION_ENUM } from '../utils/constants';
import moment from 'moment';
import { ZapierBodyDto } from './dtos/zapier-body.dto';
import { UserRepository } from 'src/user/user.repository';

@Injectable()
export class PartnerAccessService {
  constructor(
    @InjectRepository(PartnerAccessRepository)
    private partnerAccessRepository: PartnerAccessRepository,
    @InjectRepository(UserRepository)
    private userRepository: UserRepository,
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

  async updatePartnerAccessCodeUser(
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

  async updatePartnerAccessBooking({ action, client_email }: ZapierBodyDto): Promise<string> {
    const userDetails = await this.userRepository.findOne({ email: client_email });

    if (!userDetails) {
      throw new HttpException('Unable to find user', HttpStatus.BAD_REQUEST);
    }

    const partnerAccessDetails = await this.partnerAccessRepository.findOne({
      userId: userDetails.id,
    });

    if (!partnerAccessDetails) {
      throw new HttpException('Unable to find partner access code', HttpStatus.BAD_REQUEST);
    }

    let partnerAccessUpdateDetails = {};

    if (action === ZAPIER_ACTION_ENUM.NEW_BOOKING) {
      if (Number(partnerAccessDetails.therapySessionsRemaining) === 0) {
        throw new HttpException('No therapy sessions remaining', HttpStatus.FORBIDDEN);
      }

      partnerAccessUpdateDetails = {
        therapySessionsRemaining: Number(partnerAccessDetails.therapySessionsRemaining) - 1,
        therapySessionsRedeemed: Number(partnerAccessDetails.therapySessionsRedeemed) + 1,
      };
    }

    if (action === ZAPIER_ACTION_ENUM.CANCELED_BOOKING) {
      partnerAccessUpdateDetails = {
        therapySessionsRemaining: Number(partnerAccessDetails.therapySessionsRemaining) + 1,
        therapySessionsRedeemed: Number(partnerAccessDetails.therapySessionsRedeemed) - 1,
      };
    }

    try {
      await this.partnerAccessRepository.save({
        ...partnerAccessDetails,
        ...partnerAccessUpdateDetails,
      });

      return 'Successful';
    } catch (error) {
      return error;
    }
  }
}
