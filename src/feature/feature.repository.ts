import { FeatureEntity } from 'src/entities/feature.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(FeatureEntity)
export class FeatureRepository extends Repository<FeatureEntity> {}
