import { Injectable } from '@nestjs/common';
import { PartnerFeatureEntity } from 'src/entities/partner-feature.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PartnerFeatureRepository extends Repository<PartnerFeatureEntity> {}
