import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ResourceService } from 'src/resource/resource.service';
import { FEEDBACK_TAGS_ENUM } from 'src/utils/constants';
import { mockResource } from 'test/utils/mockData';
import { Repository } from 'typeorm';
import { ResourceFeedbackEntity } from '../entities/resource-feedback.entity';
import { ResourceFeedbackService } from './resource-feedback.service';

describe('ResourceFeedbackService', () => {
  let service: ResourceFeedbackService;
  let mockResourceFeedbackRepository: DeepMocked<Repository<ResourceFeedbackEntity>>;
  let mockResourceService: DeepMocked<ResourceService>;

  const resourceFeedbackDto = {
    resourceId: mockResource.id,
    feedbackTags: FEEDBACK_TAGS_ENUM.RELATABLE,
    feedbackDescription: 'feedback comments',
  } as ResourceFeedbackEntity;

  beforeEach(async () => {
    mockResourceFeedbackRepository = createMock<Repository<ResourceFeedbackEntity>>();
    mockResourceService = createMock<ResourceService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceFeedbackService,
        {
          provide: getRepositoryToken(ResourceFeedbackEntity),
          useValue: mockResourceFeedbackRepository,
        },
        {
          provide: ResourceService,
          useValue: mockResourceService,
        },
      ],
    }).compile();

    service = module.get<ResourceFeedbackService>(ResourceFeedbackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a resource feedback when resource exists', async () => {
      jest.spyOn(mockResourceService, 'findOne').mockResolvedValueOnce(mockResource);
      jest.spyOn(mockResourceFeedbackRepository, 'save').mockResolvedValueOnce(resourceFeedbackDto);

      const result = await service.create(resourceFeedbackDto);
      expect(result).toEqual(resourceFeedbackDto);
      expect(mockResourceFeedbackRepository.save).toHaveBeenCalledWith(resourceFeedbackDto);
    });

    it('should throw an HttpException when resource does not exist', async () => {
      jest.spyOn(mockResourceService, 'findOne').mockResolvedValueOnce(null);

      await expect(service.create(resourceFeedbackDto)).rejects.toThrow(
        new HttpException('RESOURCE NOT FOUND', HttpStatus.NOT_FOUND),
      );
    });
  });
});
