import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceFeedbackEntity } from 'src/entities/resource-feedback.entity';
import { ResourceEntity } from 'src/entities/resource.entity';
import { ResourceService } from 'src/resource/resource.service';
import { ResourceFeedbackController } from './resource-feedback.controller';
import { ResourceFeedbackService } from './resource-feedback.service';

@Module({
  imports: [TypeOrmModule.forFeature([ResourceFeedbackEntity, ResourceEntity])],
  controllers: [ResourceFeedbackController],
  providers: [ResourceFeedbackService, ResourceService],
})
export class ResourceFeedbackModule {}
