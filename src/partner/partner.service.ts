import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FeatureEntity } from 'src/entities/feature.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerFeatureEntity } from 'src/entities/partner-feature.entity';
import { UserEntity } from 'src/entities/user.entity';
import { FEATURES } from 'src/utils/constants';
import { In, Repository } from 'typeorm';
import { PartnerEntity } from '../entities/partner.entity';
import { CreatePartnerDto } from './dtos/create-partner.dto';
import { ActivePartnerDto, GetPartnerAdminViewDto } from './dtos/get-partner.dto';
import { UpdatePartnerDto } from './dtos/update-partner.dto';
import { slugify } from './slugify';

const PARTNER_LOOKUP = 'LOWER(partner.name) = LOWER(:value) OR partner.slug = LOWER(:value)';

@Injectable()
export class PartnerService {
  constructor(
    @InjectRepository(PartnerEntity) private partnerRepository: Repository<PartnerEntity>,
    @InjectRepository(PartnerAccessEntity)
    private partnerAccessRepository: Repository<PartnerAccessEntity>,
    @InjectRepository(PartnerAdminEntity)
    private partnerAdminRepository: Repository<PartnerAdminEntity>,
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
  ) {}

  async createPartner(createPartnerDto: CreatePartnerDto): Promise<PartnerEntity> {
    const slug = slugify(createPartnerDto.name);
    if (!slug) {
      throw new HttpException(
        'Partner name must contain a letter or digit',
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const partnerObject = this.partnerRepository.create({ ...createPartnerDto, slug });
      return await this.partnerRepository.save(partnerObject);
    } catch (error) {
      if (error.code === '23505') {
        throw new HttpException(error.detail, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  async getPartners(): Promise<GetPartnerAdminViewDto[]> {
    const partners = await this.partnerRepository.find({
      relations: { partnerFeature: { feature: true } },
    });
    return partners.map(({ partnerFeature, ...partner }) => ({
      ...partner,
      automaticAccessCode: !!partnerFeature?.some(
        (pf) => pf.active && pf.feature?.name === FEATURES.AUTOMATIC_ACCESS_CODE,
      ),
    }));
  }

  async getActivePartners(): Promise<ActivePartnerDto[]> {
    const partners = await this.partnerRepository.find({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      order: { name: 'ASC' },
    });
    return partners.map(({ id, name, slug }) => ({ id, name, slug }));
  }

  // Matches a display name (as in Storyblok's included_for_partners) or a slug
  async getPartner(value: string): Promise<PartnerEntity> {
    return await this.partnerRepository
      .createQueryBuilder('partner')
      .where(PARTNER_LOOKUP, { value })
      .getOne();
  }

  async getPartnerById(partnerId: string): Promise<PartnerEntity> {
    return await this.partnerRepository
      .createQueryBuilder('partner')
      .where('partner.partnerId = :partnerId', { partnerId })
      .getOne();
  }

  async getPartnerWithPartnerFeaturesByName(value: string): Promise<PartnerEntity> {
    return await this.partnerRepository
      .createQueryBuilder('partner')
      .leftJoinAndSelect('partner.partnerFeature', 'partnerFeature')
      .leftJoinAndSelect('partnerFeature.feature', 'feature')
      .where(PARTNER_LOOKUP, { value })
      .getOne();
  }

  async updatePartnerActiveStatus(partnerId: string, updatePartnerDto: UpdatePartnerDto) {
    const partner = await this.partnerRepository.findOneBy({ id: partnerId });
    if (!partner) {
      throw new HttpException('Partner does not exist', HttpStatus.BAD_REQUEST);
    }

    const { active, therapySessionsPerCode, automaticAccessCode } = updatePartnerDto;
    // Re-sending the current status must not cascade, or it would reactivate accesses that
    // were deactivated one by one
    const statusChanged = active !== undefined && active !== partner.isActive;

    const updatedPartnerResponse = await this.partnerRepository.save({
      ...partner,
      ...(statusChanged && { isActive: active }),
      ...(therapySessionsPerCode !== undefined && { therapySessionsPerCode }),
    });

    if (updatedPartnerResponse) {
      if (automaticAccessCode !== undefined) {
        await this.setAutomaticAccessCode(partnerId, automaticAccessCode);
      }

      if (statusChanged) {
        const partnerAdmins = await this.partnerAdminRepository.findBy({ partnerId });
        const partnerAdminIds = partnerAdmins.map((pa) => pa.id);

        await this.partnerAdminRepository
          .createQueryBuilder('partner_admin')
          .update(PartnerAdminEntity)
          .set({ active })
          .where({ id: In(partnerAdminIds) })
          .execute();

        const partnerAccess = await this.partnerAccessRepository.findBy({ partnerId });
        const partnerAccessIds = partnerAccess.map((pa) => pa.id);

        await this.partnerAccessRepository
          .createQueryBuilder('partner_access')
          .update(PartnerAccessEntity)
          .set({ active })
          .where({ id: In(partnerAccessIds) })
          .execute();
      }

      return updatedPartnerResponse;
    } else {
      throw new HttpException('Failed to update partner', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async setAutomaticAccessCode(partnerId: string, active: boolean) {
    const manager = this.partnerRepository.manager;
    let feature = await manager.findOneBy(FeatureEntity, { name: FEATURES.AUTOMATIC_ACCESS_CODE });
    if (!feature) {
      if (!active) return;
      feature = await manager.save(
        FeatureEntity,
        manager.create(FeatureEntity, { name: FEATURES.AUTOMATIC_ACCESS_CODE }),
      );
    }

    const partnerFeature = await manager.findOneBy(PartnerFeatureEntity, {
      partnerId,
      featureId: feature.id,
    });
    if (partnerFeature) {
      await manager.save(PartnerFeatureEntity, { ...partnerFeature, active });
    } else if (active) {
      // Sign-up without a code checks only that this row exists, so "off" never creates one
      await manager.save(
        PartnerFeatureEntity,
        manager.create(PartnerFeatureEntity, { partnerId, featureId: feature.id, active }),
      );
    }
  }
}
