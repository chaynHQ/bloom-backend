import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { UserEntity } from 'src/entities/user.entity';
import { In, Repository } from 'typeorm';
import { PartnerEntity } from '../entities/partner.entity';
import { CreatePartnerDto } from './dtos/create-partner.dto';
import { UpdatePartnerDto } from './dtos/update-partner.dto';

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

  async createPartner(createPartnerDto: CreatePartnerDto): Promise<PartnerEntity | unknown> {
    try {
      const partnerObject = this.partnerRepository.create(createPartnerDto);
      return await this.partnerRepository.save(partnerObject);
    } catch (error) {
      if (error.code === '23505') {
        throw new HttpException(error.detail, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  async getPartners(): Promise<PartnerEntity[]> {
    return await this.partnerRepository.find();
  }

  // TODO - unsure why we would be getting partner by name rather than ID
  async getPartner(name: string): Promise<PartnerEntity> {
    return await this.partnerRepository
      .createQueryBuilder('partner')
      .where('LOWER(partner.name) LIKE LOWER(:name)', { name: `%${name.toLowerCase()}%` })
      .getOne();
  }

  async getPartnerById(partnerId: string): Promise<PartnerEntity> {
    return await this.partnerRepository
      .createQueryBuilder('partner')
      .where('partner.partnerId = :partnerId', { partnerId })
      .getOne();
  }

  async getPartnerWithPartnerFeaturesByName(name: string): Promise<PartnerEntity> {
    return await this.partnerRepository
      .createQueryBuilder('partner')
      .leftJoinAndSelect('partner.partnerFeature', 'partnerFeature')
      .leftJoinAndSelect('partnerFeature.feature', 'feature')
      .where('LOWER(partner.name) LIKE LOWER(:name)', { name })
      .getOne();
  }

  async updatePartnerActiveStatus(partnerId: string, { active }: UpdatePartnerDto) {
    const partner = await this.partnerRepository.findOneBy({ id: partnerId });
    if (!partner) {
      throw new HttpException('Partner does not exist', HttpStatus.BAD_REQUEST);
    }

    // Update partner active status
    const updatedPartnerResponse = await this.partnerRepository.save({
      ...partner,
      isActive: active,
    });

    if (updatedPartnerResponse) {
      const partnerAdmins = await this.partnerAdminRepository.findBy({ partnerId });
      const partnerAdminIds = partnerAdmins.map((pa) => pa.id);

      // Update partner admin active status
      await this.partnerAdminRepository
        .createQueryBuilder('partner_admin')
        .update(PartnerAdminEntity)
        .set({ active: active })
        .where({ id: In(partnerAdminIds) })
        .execute();

      const partnerAccess = await this.partnerAccessRepository.findBy({ partnerId });
      const partnerAccessIds = partnerAccess.map((pa) => pa.id);

      // Update partner access active status
      await this.partnerAccessRepository
        .createQueryBuilder('partner_access')
        .update(PartnerAccessEntity)
        .set({ active: active })
        .where({ id: In(partnerAccessIds) })
        .execute();

      return updatedPartnerResponse;
    } else {
      throw new Error('Failed to update partner');
    }
  }
}
