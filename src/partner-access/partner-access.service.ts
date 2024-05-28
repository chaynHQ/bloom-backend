import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isBefore, sub } from 'date-fns';
import _ from 'lodash';
import { PartnerEntity } from 'src/entities/partner.entity';
import { UserEntity } from 'src/entities/user.entity';
import { Logger } from 'src/logger/logger';
import { Repository } from 'typeorm';
import { updateCrispProfileAccesses } from '../api/crisp/crisp-api';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { FEATURES, PartnerAccessCodeStatusEnum } from '../utils/constants';
import { CreatePartnerAccessDto } from './dtos/create-partner-access.dto';
import { GetPartnerAccessesDto } from './dtos/get-partner-access.dto';
import { UpdatePartnerAccessDto } from './dtos/update-partner-access.dto';

// TODO storing base service minimum here but this might need to be a config setup eventually
export const basePartnerAccess = {
  featureTherapy: false,
  featureLiveChat: true,
  therapySessionsRemaining: 0,
  therapySessionsRedeemed: 0,
};
@Injectable()
export class PartnerAccessService {
  private readonly logger = new Logger('PartnerAccessService');

  constructor(
    @InjectRepository(PartnerAccessEntity)
    private partnerAccessRepository: Repository<PartnerAccessEntity>,
    @InjectRepository(PartnerEntity)
    private partnerRepository: Repository<PartnerEntity>,
  ) {}

  async createPartnerAccess(
    createPartnerAccessDto: CreatePartnerAccessDto,
    partnerId: string,
    partnerAdminId: string | null,
    userId?: string,
  ): Promise<PartnerAccessEntity> {
    const accessCode = await this.generateAccessCode(6);
    const partnerAccess = this.partnerAccessRepository.create({
      ...createPartnerAccessDto,
      ...(userId && { userId }),
      partnerAdminId,
      partnerId,
      accessCode,
    });
    return await this.partnerAccessRepository.save(partnerAccess);
  }

  private async generateAccessCode(length: number): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890';
    const accessCode = _.sampleSize(chars, length || 6).join('');

    const existingPartnerAccess = await this.partnerAccessRepository.findOneBy({ accessCode });

    if (existingPartnerAccess) {
      await this.generateAccessCode(6);
    }
    return accessCode;
  }

  async getPartnerAccessByCode(
    partnerAccessCode: string,
    userId?: string,
  ): Promise<PartnerAccessEntity> {
    const format = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

    if (format.test(partnerAccessCode) || partnerAccessCode.length !== 6) {
      throw new HttpException(PartnerAccessCodeStatusEnum.INVALID_CODE, HttpStatus.BAD_REQUEST);
    }

    const partnerAccess = await this.partnerAccessRepository.findOne({
      where: { accessCode: partnerAccessCode },
      relations: { partner: true },
    });

    if (!partnerAccess) {
      throw new HttpException(PartnerAccessCodeStatusEnum.DOES_NOT_EXIST, HttpStatus.BAD_REQUEST);
    }

    if (partnerAccess.userId) {
      if (userId && partnerAccess.userId === userId) {
        throw new HttpException(PartnerAccessCodeStatusEnum.ALREADY_APPLIED, HttpStatus.CONFLICT);
      } else {
        throw new HttpException(PartnerAccessCodeStatusEnum.ALREADY_IN_USE, HttpStatus.CONFLICT);
      }
    }

    // ensure the partner access code has been created no more than a year ago
    if (isBefore(new Date(partnerAccess.createdAt), sub(new Date(), { years: 1 }))) {
      throw new HttpException(PartnerAccessCodeStatusEnum.CODE_EXPIRED, HttpStatus.BAD_REQUEST);
    }

    return partnerAccess;
  }

  async validatePartnerAutomaticAccessCode(partnerId: string) {
    const partner = await this.partnerRepository.findOne({
      where: { id: partnerId },
      relations: { partnerFeature: true },
    });

    if (!partner) {
      throw new HttpException('Invalid partnerId supplied', HttpStatus.BAD_REQUEST);
    }

    const automaticAccessCodePartnerFeature = partner.partnerFeature.find(
      (pf) => pf.feature.name === FEATURES.AUTOMATIC_ACCESS_CODE,
    );

    if (!automaticAccessCodePartnerFeature) {
      throw new HttpException(
        'Partner does not have automatic access code Feature',
        HttpStatus.BAD_REQUEST,
      );
    }
    return true;
  }

  async getPartnerAccessCodes(
    partnerAccessDto: GetPartnerAccessesDto | undefined,
  ): Promise<PartnerAccessEntity[]> {
    return await this.partnerAccessRepository.find({
      where: partnerAccessDto || undefined,
      relations: { partner: true },
    });
  }

  // TODO Potentially delete service method as it was not used for purpose it was made for
  async getUserTherapySessions(): Promise<PartnerAccessEntity[]> {
    try {
      const response = await this.partnerAccessRepository
        .createQueryBuilder('partnerAccess')
        .leftJoin('partnerAccess.user', 'user') //get user associated with access code
        .select([
          'max(user.email) as userEmail', //get first user email. This will also return nulls as there is no way to add a condition to a joined column apparently
          'sum(partnerAccess.therapySessionsRemaining) as therapyTotal', //get total therapy sessions available
          'sum(partnerAccess.therapySessionsRedeemed) as therapyRedeemed', //get total therapy sessions available
          'max(partnerAccess.accessCode) as partnerAccessCode', //get any access code - this will be used as an identifier to update. Uuids do not have aggregate functions in postgres so its a bit annoying to get that instead
        ])
        .where('partnerAccess.featureTherapy=true') //only get access codes with feature therapy turned on
        .andWhere('partnerAccess.userId is not null') //only get access codes with a user id
        .andWhere('partnerAccess.active=true')
        .groupBy('partnerAccess.userId') //group by user as we can have users with multiple access codes
        .getRawMany(); //use instead of getMany as the columns are derived
      return response;
    } catch (error) {
      throw new HttpException(
        `Unable to get users with access codes! Error: ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updatePartnerAccess(
    id: string,
    updates: UpdatePartnerAccessDto,
  ): Promise<PartnerAccessEntity> {
    try {
      const property = await this.partnerAccessRepository.findOneBy({
        id,
      });

      return await this.partnerAccessRepository.save({
        ...property, // existing fields
        ...updates, // updated fields
      });
    } catch (error) {
      throw new HttpException(
        `updatePartnerAccess - Unable to update partner access ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async assignPartnerAccess(
    user: UserEntity,
    partnerAccessCode: string,
  ): Promise<PartnerAccessEntity> {
    const partnerAccess = await this.getPartnerAccessByCode(partnerAccessCode, user.id);
    const assignedPartnerAccess = await this.partnerAccessRepository.save({
      ...partnerAccess,
      userId: user.id,
      activatedAt: new Date(),
    });
    assignedPartnerAccess.partner = partnerAccess.partner;

    try {
      const partnerAccesses = await this.partnerAccessRepository.findBy({
        userId: user.id,
        active: true,
      });
      updateCrispProfileAccesses(user, partnerAccesses);
    } catch (error) {
      this.logger.error(
        `Error: Unable to update crisp profile for ${user.email}. Error: ${error.message} `,
        error,
      );
    }

    return assignedPartnerAccess;
  }

  public async deleteCypressTestAccessCodes(): Promise<void> {
    try {
      const partnerAccessRecords = await this.partnerAccessRepository //get partner access instances where user is a cypress user
        .createQueryBuilder('partnerAccess')
        .leftJoinAndSelect('partnerAccess.user', 'user')
        .where('user.name LIKE :searchTerm', { searchTerm: `%Cypress test%` })
        .getMany();
      await Promise.all(
        partnerAccessRecords.map(async (access) => {
          try {
            await this.partnerAccessRepository.delete(access.id); //permanently delete the access code
            return access;
          } catch (error) {
            this.logger.error(`Unable to delete access code: ${access.id} ${error}`);
          }
        }),
      );
    } catch (error) {
      // If this fails we don't want to break cypress tests but we want to be alerted
      this.logger.error(`deleteCypressTestAccessCodes - Unable to delete access code`, error);
    }
  }
}
