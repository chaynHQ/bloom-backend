import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PartnerEntity } from '../entities/partner.entity';

@Injectable()
export class PartnerRepository extends Repository<PartnerEntity> {}
