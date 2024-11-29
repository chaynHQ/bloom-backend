import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceEntity } from '../entities/resource.entity';
import { CreateResourceDto } from './dtos/create-resource.dto';

@Injectable()
export class ResourceService {
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
}
