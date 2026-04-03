import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ResourceUserEntity } from 'src/entities/resource-user.entity';
import { UserEntity } from 'src/entities/user.entity';
import { ResourceService } from 'src/resource/resource.service';
import { formatResourceUserObject } from 'src/utils/serialize';
import { Repository } from 'typeorm';
import { CreateResourceUserRecordDto } from './dtos/create-resource-user-record.dto';
import { ResourceUserDto } from './dtos/resource-user.dto';

@Injectable()
export class ResourceUserService {
  constructor(
    @InjectRepository(ResourceUserEntity)
    private resourceUserRepository: Repository<ResourceUserEntity>,
    private resourceService: ResourceService,
  ) {}

  private async getResourceUser({
    resourceId,
    userId,
  }: CreateResourceUserRecordDto): Promise<ResourceUserEntity> {
    return await this.resourceUserRepository
      .createQueryBuilder('resource_user')
      .leftJoinAndSelect('resource_user.resource', 'resource')
      .where('resource_user.userId = :userId', { userId })
      .andWhere('resource_user.resourceId = :resourceId', { resourceId })
      .getOne();
  }

  async createResourceUserRecord({
    resourceId,
    userId,
  }: CreateResourceUserRecordDto): Promise<ResourceUserEntity> {
    return await this.resourceUserRepository.save({
      resourceId,
      userId,
      completedAt: null,
    });
  }

  public async createResourceUser(user: UserEntity, { storyblokUuid }: ResourceUserDto) {
    const resource = await this.resourceService.getResourceByStoryblokUuid(storyblokUuid);

    if (!resource) {
      throw new HttpException('RESOURCE NOT FOUND', HttpStatus.NOT_FOUND);
    }

    let resourceUser = await this.getResourceUser({
      resourceId: resource.id,
      userId: user.id,
    });

    if (!resourceUser) {
      resourceUser = await this.createResourceUserRecord({
        resourceId: resource.id,
        userId: user.id,
      });
    }

    return formatResourceUserObject([{ ...resourceUser, resource }])[0];
  }

  public async setResourceUserCompleted(
    user: UserEntity,
    { storyblokUuid }: ResourceUserDto,
    completed: boolean,
  ) {
    const resource = await this.resourceService.getResourceByStoryblokUuid(storyblokUuid);

    if (!resource) {
      throw new HttpException(
        `Resource not found for storyblok uuid: ${storyblokUuid}`,
        HttpStatus.NOT_FOUND,
      );
    }

    let resourceUser = await this.getResourceUser({
      resourceId: resource.id,
      userId: user.id,
    });

    if (resourceUser) {
      resourceUser = await this.resourceUserRepository.save({
        ...resourceUser,
        completedAt: completed ? new Date() : null,
      });
    } else {
      resourceUser = await this.createResourceUserRecord({
        resourceId: resource.id,
        userId: user.id,
      });
    }

    return formatResourceUserObject([{ ...resourceUser, resource }])[0];
  }
}
