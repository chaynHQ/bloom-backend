import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ResourceUserEntity } from 'src/entities/resource-user.entity';
import { Repository } from 'typeorm';
import { CreateResourceUserDto } from './dtos/create-resource-user.dto';
import { UpdateResourceUserDto } from './dtos/update-resource-user.dto';

@Injectable()
export class ResourceUserService {
  constructor(
    @InjectRepository(ResourceUserEntity)
    private resourceUserRepository: Repository<ResourceUserEntity>,
  ) {}

  create(createResourceUserDto: CreateResourceUserDto) {
    const newResourceUser = this.resourceUserRepository.create(createResourceUserDto);
    return this.resourceUserRepository.save(newResourceUser);
  }

  update(id: string, updateResourceUserDto: UpdateResourceUserDto) {
    const resourceUser = this.resourceUserRepository.findOne({ where: { id } });

    if (!resourceUser) {
      throw new HttpException('RESOURCE USER NOT FOUND', HttpStatus.NOT_FOUND);
    }

    const updatedResourceUser = { ...resourceUser, ...updateResourceUserDto };

    return this.resourceUserRepository.save(updatedResourceUser);
  }
}
