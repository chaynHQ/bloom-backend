import { PartnerFeatureEntity } from 'src/entities/partner-feature.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(PartnerFeatureEntity)
export class PartnerFeatureRepository extends Repository<PartnerFeatureEntity> {}
