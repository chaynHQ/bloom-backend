import { Injectable } from '@nestjs/common';
import { FeatureEntity } from 'src/entities/feature.entity';
import { Repository } from 'typeorm';

@Injectable()
export class FeatureRepository extends Repository<FeatureEntity> {}
