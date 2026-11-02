import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CourseUserService } from 'src/course-user/course-user.service';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { CourseEntity } from 'src/entities/course.entity';
import { ResourceUserEntity } from 'src/entities/resource-user.entity';
import { ResourceEntity } from 'src/entities/resource.entity';
import { UserEntity } from 'src/entities/user.entity';
import { Logger } from 'src/logger/logger';
import { ResourceService } from 'src/resource/resource.service';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';
import { formatResourceUserObject } from 'src/utils/serialize';
import { In, IsNull, Not, Repository } from 'typeorm';
import { CreateResourceUserRecordDto } from './dtos/create-resource-user-record.dto';
import { ResourceUserDto } from './dtos/resource-user.dto';

// A course this request started and/or completed, so the frontend can log the analytics events.
export interface CourseProgressChange {
  storyblokUuid: string;
  name: string;
  started: boolean;
  completed: boolean;
}

@Injectable()
export class ResourceUserService {
  private readonly logger = new Logger('ResourceUserService');

  constructor(
    @InjectRepository(ResourceUserEntity)
    private resourceUserRepository: Repository<ResourceUserEntity>,
    @InjectRepository(ResourceEntity)
    private resourceRepository: Repository<ResourceEntity>,
    @InjectRepository(CourseEntity)
    private courseRepository: Repository<CourseEntity>,
    @InjectRepository(CourseUserEntity)
    private courseUserRepository: Repository<CourseUserEntity>,
    private resourceService: ResourceService,
    private courseUserService: CourseUserService,
    private serviceUserProfilesService: ServiceUserProfilesService,
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
    completedAt = null,
  }: CreateResourceUserRecordDto & { completedAt?: Date | null }): Promise<ResourceUserEntity> {
    return await this.resourceUserRepository.save({
      resourceId,
      userId,
      completedAt,
    });
  }

  public async createResourceUser(
    user: UserEntity,
    { storyblokUuid, courseStoryblokUuid }: ResourceUserDto,
  ) {
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

    const courseProgress = courseStoryblokUuid
      ? await this.updateCourseProgress(user, resource, courseStoryblokUuid)
      : [];

    return this.formatResponse(resourceUser, resource, courseProgress);
  }

  public async setResourceUserCompleted(
    user: UserEntity,
    { storyblokUuid, courseStoryblokUuid }: ResourceUserDto,
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
        completedAt: completed ? new Date() : null,
      });
    }

    // Course completion is one-way, so marking a resource incomplete never touches courses.
    const courseProgress = completed
      ? await this.updateCourseProgress(user, resource, courseStoryblokUuid)
      : [];

    return this.formatResponse(resourceUser, resource, courseProgress);
  }

  private formatResponse(
    resourceUser: ResourceUserEntity,
    resource: ResourceEntity,
    courseProgress: CourseProgressChange[],
  ) {
    return {
      ...formatResourceUserObject([{ ...resourceUser, resource }])[0],
      ...(courseProgress.length > 0 && { courseProgress }),
    };
  }

  // Starts the context course (when the resource is one of its pieces) and completes any started
  // course this resource finishes. Never throws: course logic mustn't fail resource progress.
  private async updateCourseProgress(
    user: UserEntity,
    resource: ResourceEntity,
    courseStoryblokUuid?: string,
  ): Promise<CourseProgressChange[]> {
    const changes = new Map<string, CourseProgressChange>();
    const changeFor = (course: CourseEntity) => {
      if (!changes.has(course.id)) {
        changes.set(course.id, {
          storyblokUuid: course.storyblokUuid,
          name: course.name,
          started: false,
          completed: false,
        });
      }
      return changes.get(course.id);
    };

    try {
      if (courseStoryblokUuid) {
        const course = await this.courseRepository.findOneBy({
          storyblokUuid: courseStoryblokUuid,
          resources: { id: resource.id },
        });
        if (course) {
          const created = await this.courseUserService.createCourseUserIfMissing({
            userId: user.id,
            courseId: course.id,
          });
          if (created) changeFor(course).started = true;
        }
      }

      const openCourseUsers = await this.courseUserRepository.find({
        where: { userId: user.id, completed: false, course: { resources: { id: resource.id } } },
        relations: { course: true },
      });

      for (const courseUser of openCourseUsers) {
        const { course } = courseUser;
        if (!(await this.isCourseComplete(user.id, course.id))) continue;
        if (await this.courseUserService.markCourseUserCompleted(courseUser.id)) {
          changeFor(course).completed = true;
        }
      }
    } catch (error) {
      this.logger.error(
        `Course progress update failed for user ${user.id} and resource ${resource.storyblokUuid}: ${error?.message || 'unknown error'}`,
      );
    }

    for (const courseId of changes.keys()) {
      this.syncCourseProfiles(user, courseId);
    }

    return [...changes.values()];
  }

  // As for sessions (`checkCourseIsComplete`): complete when every published piece linked to the
  // course has a completed resource_user row.
  private async isCourseComplete(userId: string, courseId: string): Promise<boolean> {
    const publishedPieces = await this.resourceRepository.find({
      select: { id: true },
      where: { courses: { id: courseId }, status: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED },
    });
    if (publishedPieces.length === 0) return false;

    // resource_user has no unique index, so any completed row counts.
    const completedRows = await this.resourceUserRepository.find({
      select: { resourceId: true },
      where: {
        userId,
        resourceId: In(publishedPieces.map((r) => r.id)),
        completedAt: Not(IsNull()),
      },
    });
    const completedResourceIds = new Set(completedRows.map((row) => row.resourceId));
    return publishedPieces.every((r) => completedResourceIds.has(r.id));
  }

  // Mailchimp and Front need the course relation loaded. Not awaited, so a slow or failing sync
  // never delays or fails the resource response.
  private syncCourseProfiles(user: UserEntity, courseId: string) {
    this.courseUserService
      .getCourseUser({ userId: user.id, courseId })
      .then((courseUser) =>
        this.serviceUserProfilesService.updateServiceUserProfilesCourse(courseUser, user.email),
      )
      .catch((error) =>
        this.logger.error(
          `Course profile sync failed for user ${user.id} and course ${courseId}: ${error?.message || 'unknown error'}`,
        ),
      );
  }
}
