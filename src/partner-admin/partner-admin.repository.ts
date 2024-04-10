import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PartnerAdminEntity } from '../entities/partner-admin.entity';

@Injectable()
export class PartnerAdminRepository extends Repository<PartnerAdminEntity> {}
