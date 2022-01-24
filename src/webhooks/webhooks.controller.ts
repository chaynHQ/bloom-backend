import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { CourseDto } from 'src/course/dtos/course.dto';
import { SessionDto } from 'src/session/dto/session.dto';
import { SimplybookBodyDto } from '../partner-access/dtos/zapier-body.dto';
import { ZapierAuthGuard } from '../partner-access/zapier-auth.guard';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @UseGuards(ZapierAuthGuard)
  @Post('simplybook')
  @ApiBody({ type: SimplybookBodyDto })
  async updatePartnerAccessBooking(@Body() simplybookBodyDto: SimplybookBodyDto): Promise<string> {
    return this.webhooksService.updatePartnerAccessBooking(simplybookBodyDto);
  }

  @Post('course')
  @ApiBody({ type: CourseDto })
  async createCourse(@Body() courseDto: CourseDto) {
    return this.webhooksService.createCourse(courseDto);
  }

  @Patch('course/:storyblokId')
  @ApiBody({ type: CourseDto })
  async updateCourse(@Param('storyblokId') storyblokId: string, @Body() body: Partial<CourseDto>) {
    return this.webhooksService.updateCourse(storyblokId, body);
  }

  @Post('session')
  async createSession(@Body() sessionDto: SessionDto) {
    return this.webhooksService.createSession(sessionDto);
  }

  @Patch('session/:storyblokId')
  async updateSession(
    @Param('storyblokId') storyblokId: string,
    @Body() body: Partial<SessionDto>,
  ) {
    return this.webhooksService.updateSession(storyblokId, body);
  }
}
