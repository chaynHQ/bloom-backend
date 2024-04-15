import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FeatureEntity } from 'src/entities/feature.entity';
import { Repository } from 'typeorm';
import { CreateFeatureDto } from './dtos/create-feature.dto';

@Injectable()
export class FeatureService {
  constructor(
    @InjectRepository(FeatureEntity) private featureRepository: Repository<FeatureEntity>,
  ) {}
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
  public async getFeatureByName(name: string): Promise<FeatureEntity> {
    return await this.featureRepository
      .createQueryBuilder('Feature')
      .where('Feature.name = :name', { name })
      .getOne();
  }

  async getFeatures(): Promise<FeatureEntity[]> {
    return await this.featureRepository.find();
  }
}
