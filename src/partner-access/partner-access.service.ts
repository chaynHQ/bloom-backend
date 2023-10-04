import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isBefore, sub } from 'date-fns';
import _ from 'lodash';
import { PartnerEntity } from 'src/entities/partner.entity';
import { Logger } from 'src/logger/logger';
import { PartnerRepository } from 'src/partner/partner.repository';
import { updateCrispProfileAccesses } from '../api/crisp/crisp-api';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { GetUserDto } from '../user/dtos/get-user.dto';
import { PartnerAccessCodeStatusEnum } from '../utils/constants';
import { CreatePartnerAccessDto } from './dtos/create-partner-access.dto';
import { GetPartnerAccessesDto } from './dtos/get-partner-access.dto';
import { UpdatePartnerAccessDto } from './dtos/update-partner-access.dto';
import { PartnerAccessRepository } from './partner-access.repository';

// TODO storing base service minimum here but this might need to be a config setup eventually
const basePartnerAccess = {
  featureTherapy: false,
  featureLiveChat: true,
  therapySessionsRemaining: 0,
  therapySessionsRedeemed: 0,
};
@Injectable()
export class PartnerAccessService {
  private readonly logger = new Logger('PartnerAccessService');

  constructor(
    @InjectRepository(PartnerAccessRepository)
    private partnerAccessRepository: PartnerAccessRepository,
    @InjectRepository(PartnerRepository)
    private partnerRepository: PartnerRepository,
  ) {}

  async createPartnerAccess(
    createPartnerAccessDto: CreatePartnerAccessDto,
    partnerId: string,
    partnerAdminId: string | null,
  ): Promise<PartnerAccessEntity> {
    const partnerAccessBase = this.partnerAccessRepository.create(createPartnerAccessDto);
    const accessCode = await this.generateAccessCode(6);
    const partnerAccess = {
      ...partnerAccessBase,
      partnerAdminId,
      partnerId,
      accessCode,
    };
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

  async getValidPartnerAccessCode(partnerAccessCode: string): Promise<PartnerAccessEntity> {
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

    // ensure the partner access code has been created no more than a year ago
    if (isBefore(new Date(partnerAccess.createdAt), sub(new Date(), { years: 1 }))) {
      throw new HttpException(PartnerAccessCodeStatusEnum.CODE_EXPIRED, HttpStatus.BAD_REQUEST);
    }

    return partnerAccess;
  }

  async getPartnerAccessCodes(
    partnerAccessDto: GetPartnerAccessesDto | undefined,
  ): Promise<PartnerAccessEntity[]> {
    return await this.partnerAccessRepository.find({
      relations: ['partner'],
      where: partnerAccessDto ? partnerAccessDto : undefined,
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
      const property = await this.partnerAccessRepository.findOne({
        where: { id },
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

  async assignPartnerAccessOnSignup(
    partnerAccess: PartnerAccessEntity,
    userId: string,
  ): Promise<PartnerAccessEntity> {
    const partnerResponse: PartnerEntity | undefined = await this.partnerRepository.findOne({
      id: partnerAccess.partnerId,
    });

    const updatedPartnerAccess = await this.partnerAccessRepository.save({
      ...partnerAccess,
      userId,
      activatedAt: new Date(),
    });

    return { ...updatedPartnerAccess, partner: partnerResponse };
  }
  async createAndAssignPartnerAccess(
    partner: PartnerEntity,
    userId: string,
  ): Promise<PartnerAccessEntity> {
    // Base partner access is for bumble. For future iterations we might want to store this base config somewhere
    const partnerAccessBase = await this.createPartnerAccess(basePartnerAccess, partner.id, null);
    const partnerAccess = {
      ...partnerAccessBase,
      userId,
      activatedAt: new Date(),
    };
    const updatedPartnerAccess = await this.partnerAccessRepository.save(partnerAccess);

    return { ...updatedPartnerAccess, partner: partner };
  }

  async assignPartnerAccess(
    { user, partnerAccesses, courses }: GetUserDto,
    partnerAccessCode: string,
  ): Promise<PartnerAccessEntity> {
    const partnerAccess = await this.getValidPartnerAccessCode(partnerAccessCode);

    partnerAccess.userId = user.id;
    partnerAccess.activatedAt = new Date();
    partnerAccesses.push(partnerAccess);

    await this.partnerAccessRepository.save(partnerAccess);
    try {
      await updateCrispProfileAccesses(user, partnerAccesses, courses);
    } catch (error) {
      this.logger.error(
        `Error: Unable to update crisp profile for ${user.email}. Error: ${error.message} `,
        error,
      );
    }

    return partnerAccess;
  }

  public async deleteCypressTestAccessCodes(): Promise<void> {
    try {
      const partnerAccessRecords = await this.partnerAccessRepository //get partner access instances where user is a cypress user
        .createQueryBuilder('partnerAccess')
        .leftJoinAndSelect('partnerAccess.user', 'user')
        .where('user.name LIKE :searchTerm', { searchTerm: `%Cypress test user%` })
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
