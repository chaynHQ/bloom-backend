import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ResourceService } from 'src/resource/resource.service';
import { Repository } from 'typeorm';
import { ResourceFeedbackEntity } from '../entities/resource-feedback.entity';
import { CreateResourceFeedbackDto } from './dtos/create-resource-feedback.dto';

@Injectable()
export class ResourceFeedbackService {
  constructor(
    @InjectRepository(ResourceFeedbackEntity)
    private resourceFeedbackRepository: Repository<ResourceFeedbackEntity>,
    private readonly resourceService: ResourceService,
  ) {}

  async create(
    createResourceFeedbackDto: CreateResourceFeedbackDto,
  ): Promise<ResourceFeedbackEntity> {
    const resource = await this.resourceService.findOne(createResourceFeedbackDto.resourceId);

    if (!resource) {
      throw new HttpException('RESOURCE NOT FOUND', HttpStatus.NOT_FOUND);
    }

    return this.resourceFeedbackRepository.save(createResourceFeedbackDto);
  }
}
