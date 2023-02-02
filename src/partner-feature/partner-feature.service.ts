import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerFeatureEntity } from 'src/entities/partner-feature.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { FeatureService } from 'src/feature/feature.service';
import { PartnerService } from 'src/partner/partner.service';
import { UserRepository } from '../user/user.repository';
import { CreatePartnerFeatureDto } from './dtos/create-partner-feature.dto';
import { GetPartnerFeatureDto } from './dtos/get-partner-feature.dto';
import { PartnerFeatureDto } from './dtos/partner-feature.dto';
import { PartnerFeatureRepository } from './partner-feature.repository';

@Injectable()
export class PartnerFeatureService {
  constructor(
    @InjectRepository(PartnerFeatureRepository)
    private partnerFeatureRepository: PartnerFeatureRepository,
    @InjectRepository(UserRepository) private userRepository: UserRepository,
    private readonly partnerService: PartnerService,
    private readonly featureService: FeatureService,
  ) {}

  async getPartnerFeature({ partnerFeatureId }: PartnerFeatureDto): Promise<PartnerFeatureEntity> {
    return await this.partnerFeatureRepository
      .createQueryBuilder('partner_feature')
      .leftJoinAndSelect('feature.featureId', 'featureId')
      .where('partner_feature.partnerFeatureId = :partnerFeatureId', { partnerFeatureId })
      .getOne();
  }

  async getPartnerFeatures(filter: GetPartnerFeatureDto): Promise<PartnerFeatureEntity[]> {
    return await this.partnerFeatureRepository
      .createQueryBuilder('partner_feature')
      .leftJoinAndSelect('feature.featureId', 'featureId')
      .where(filter)
      .getMany();
  }

  public async createPartnerFeature({ partnerId, featureId, active }: CreatePartnerFeatureDto) {
    const feature = await this.featureService.getFeature(featureId);

    if (!feature) {
      throw new HttpException('FEATURE NOT FOUND', HttpStatus.BAD_REQUEST);
    }

    const partner: PartnerEntity = await this.partnerService.getPartnerById(partnerId);

    if (!partner) {
      throw new HttpException('PARTNER NOT FOUND', HttpStatus.BAD_REQUEST);
    }

    const partnerFeature = await this.partnerFeatureRepository.create({
      partnerId,
      featureId,
      active,
    });
    try {
      const newPartnerFeature = await this.partnerFeatureRepository.save(partnerFeature);
      return newPartnerFeature;
    } catch (error) {
      throw error;
    }
  }
}
