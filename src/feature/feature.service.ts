import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FeatureEntity } from 'src/entities/feature.entity';
import { CreateFeatureDto } from './dtos/create-feature.dto';
import { FeatureRepository } from './feature.repository';

@Injectable()
export class FeatureService {
  constructor(@InjectRepository(FeatureRepository) private featureRepository: FeatureRepository) {}
  async createFeature(createFeatureDto: CreateFeatureDto): Promise<FeatureEntity | unknown> {
    try {
      const featureObject = this.featureRepository.create(createFeatureDto);
      return await this.featureRepository.save(featureObject);
    } catch (error) {
      if (error.code === '23505') {
        throw new HttpException(error.detail, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }
  async getFeature(featureId: string): Promise<FeatureEntity> {
    return await this.featureRepository
      .createQueryBuilder('Feature')
      .where('Feature.featureId = :featureId', { featureId })
      .getOne();
  }

  async getFeatures(): Promise<FeatureEntity[]> {
    return await this.featureRepository.find();
  }
}
