import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PartnerAccessEntity } from '../entities/partner-access.entity';

@Injectable()
export class PartnerAccessRepository extends Repository<PartnerAccessEntity> {}
