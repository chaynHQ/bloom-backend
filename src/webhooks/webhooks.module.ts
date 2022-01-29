import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseRepository } from 'src/course/course.repository';
import { SessionRepository } from 'src/session/session.repository';
import { PartnerAccessRepository } from '../partner-access/partner-access.repository';
import { UserRepository } from '../user/user.repository';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PartnerAccessRepository,
      UserRepository,
      CourseRepository,
      SessionRepository,
    ]),
  ],
  providers: [WebhooksService],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
