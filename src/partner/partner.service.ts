import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { UserEntity } from 'src/entities/user.entity';
import { In, Repository } from 'typeorm';
import { PartnerEntity } from '../entities/partner.entity';
import { CreatePartnerDto } from './dtos/create-partner.dto';
import { DeletePartnerDto } from './dtos/delete-partner.dto';
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

  async deletePartner({ partnerId }: DeletePartnerDto): Promise<string> {
    const partner = await this.partnerRepository.findOneBy({ id: partnerId });
    if (!partner) {
      throw new HttpException('Partner does not exist', HttpStatus.BAD_REQUEST);
    }

    await this.partnerAccessRepository
      .createQueryBuilder('partner_access')
      .update(PartnerAccessEntity)
      .set({ active: false })
      .where('partnerId = :partnerId', { partnerId })
      .execute();

    // //Partner Admins
    const partnerAdmins = await this.partnerAdminRepository.findBy({ partnerId });
    const partnerAdminUserIds = partnerAdmins.map((pa) => {
      return pa.userId;
    });

    await this.userRepository
      .createQueryBuilder('user')
      .update(UserEntity)
      .set({ isActive: false })
      .where({ id: In(partnerAdminUserIds) })
      .execute();

    partner.isActive = false;
    await this.partnerRepository.save(partner);

    return 'Successful';
  }

  async updatePartner(partnerId: string, { active }: UpdatePartnerDto){
    const updatedPartnerResponse = await this.partnerRepository
      .createQueryBuilder()
      .update(PartnerEntity)
      .set({ isActive: active })
      .where('id = :id', { id: partnerId })
      .returning('*')
      .execute();
    if (updatedPartnerResponse.raw.length > 0) {
      return updatedPartnerResponse.raw[0];
    } else {
      throw new Error('Failed to update partner');
    }
  }
}
