import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from 'src/logger/logger';
import { RESOURCE_TYPE_ENUM } from 'src/utils/constants';
import { ISbResult } from 'storyblok-js-client';
import { Repository } from 'typeorm';
import { ResourceEntity } from '../entities/resource.entity';
import { CreateResourceDto } from './dtos/create-resource.dto';

@Injectable()
export class ResourceService {
  private readonly logger = new Logger('ResourceService');

  constructor(
    @InjectRepository(ResourceEntity)
    private resourceRepository: Repository<ResourceEntity>,
  ) {}

  async findOne(id: string): Promise<ResourceEntity> {
    return this.resourceRepository.findOne({ where: { id } });
  }
  async create(createResourceDto: CreateResourceDto): Promise<ResourceEntity> {
    const newResource = this.resourceRepository.create(createResourceDto);
    return this.resourceRepository.save(newResource);
  }

  async createResourceFromStoryData(storyData: ISbResult): Promise<ResourceEntity> {
    const data = storyData.data.story;
    const newResource = {
      name: data.name,
      slug: data.full_slug,
      status: data.status,
      storyblokId: data.story_id,
      storyblokUuid: data.uuid,
      category:
        data.content.component === 'Shorts'
          ? RESOURCE_TYPE_ENUM.SHORT
          : RESOURCE_TYPE_ENUM.CONVERSATION,
    };

    try {
      const resource = this.resourceRepository.create(newResource);
      const dbResource = await this.resourceRepository.save(resource);
      this.logger.log(`Storyblok resource ${data.status} success - ${resource.name}`);
      return dbResource;
    } catch (err) {
      const error = `Storyblok webhook failed - error creating new resource record - ${err}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
