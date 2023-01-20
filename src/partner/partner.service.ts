import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { UserEntity } from 'src/entities/user.entity';
import { PartnerAccessRepository } from 'src/partner-access/partner-access.repository';
import { PartnerAdminRepository } from 'src/partner-admin/partner-admin.repository';
import { UserRepository } from 'src/user/user.repository';
import { In } from 'typeorm';
import { PartnerEntity } from '../entities/partner.entity';
import { CreatePartnerDto } from './dtos/create-partner.dto';
import { DeletePartnerDto } from './dtos/delete-partner.dto';
import { PartnerRepository } from './partner.repository';

@Injectable()
export class PartnerService {
  constructor(
    @InjectRepository(PartnerRepository) private partnerRepository: PartnerRepository,
    @InjectRepository(PartnerAccessRepository)
    private partnerAccessRepository: PartnerAccessRepository,
    @InjectRepository(PartnerAdminRepository)
    private partnerAdminRepository: PartnerAdminRepository,
    @InjectRepository(UserRepository) private userRepository: UserRepository,
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
  async getPartnerWithPartnerFeatures(name: string): Promise<PartnerEntity> {
    return await this.partnerRepository
      .createQueryBuilder('partner')
      .leftJoinAndSelect('partner.partnerFeature', 'partnerFeature')
      .leftJoinAndSelect('partnerFeature.feature', 'feature')
      .where('LOWER(partner.name) LIKE LOWER(:name)', { name })
      .getOne();
  }

  async deletePartner({ partnerId }: DeletePartnerDto): Promise<string> {
    try {
      const partner = await this.partnerRepository.findOne({ where: { id: partnerId } });
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
      const partnerAdmins = await this.partnerAdminRepository.find({ where: { partnerId } });
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
    } catch (error) {
      throw error;
    }
  }
}
