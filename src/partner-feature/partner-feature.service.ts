import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerFeatureEntity } from 'src/entities/partner-feature.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { FeatureService } from 'src/feature/feature.service';
import { PartnerService } from 'src/partner/partner.service';
import { FEATURES } from 'src/utils/constants';
import { Repository } from 'typeorm';
import { CreatePartnerFeatureDto } from './dtos/create-partner-feature.dto';
import { GetPartnerFeatureDto } from './dtos/get-partner-feature.dto';
import { PartnerFeatureDto } from './dtos/partner-feature.dto';
import { UpdatePartnerFeatureDto } from './dtos/update-partner-feature.dto';

@Injectable()
export class PartnerFeatureService {
  constructor(
    @InjectRepository(PartnerFeatureEntity)
    private partnerFeatureRepository: Repository<PartnerFeatureEntity>,
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
    const newPartnerFeature = await this.partnerFeatureRepository.save(partnerFeature);
    return newPartnerFeature;
  }

  public async updatePartnerFeature(partnerFeatureId, { active }: UpdatePartnerFeatureDto) {
    const updatedPartnerFeatureResponse = await this.partnerFeatureRepository
      .createQueryBuilder()
      .update(PartnerFeatureEntity)
      .set({ active })
      .where('id = :id', { id: partnerFeatureId })
      .returning('*')
      .execute();
    if (updatedPartnerFeatureResponse.raw.length > 0) {
      return updatedPartnerFeatureResponse.raw[0];
    } else {
      throw new Error('Failed to update partner feature');
    }
  }

  public async getAutomaticAccessCodeFeatureForPartner(partnerName) {
    const partner = await this.partnerService.getPartner(partnerName);
    if (!partner) {
      throw new HttpException('Unable to find partner with that name', HttpStatus.BAD_REQUEST);
    }
    const partnerFeature = await this.partnerFeatureRepository
      .createQueryBuilder('partnerFeature')
      .leftJoinAndSelect('partnerFeature.feature', 'feature')
      .where('LOWER(feature.name) LIKE LOWER(:name)', {
        name: FEATURES.AUTOMATIC_ACCESS_CODE,
      })
      .andWhere('partnerFeature.partnerId = :partnerId', { partnerId: partner.id })
      .getOne();
    return partnerFeature;
  }
}
