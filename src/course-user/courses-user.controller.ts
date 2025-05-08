import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ICoursesWithSessions } from 'src/course/course.interface';
import { UserEntity } from 'src/entities/user.entity';
import { ControllerDecorator } from 'src/utils/controller.decorator';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { formatCourseUserObjects } from '../utils/serialize';
import { CourseUserService } from './course-user.service';

@ApiTags('Courses User')
@ControllerDecorator()
@Controller('/v1/courses-user')
export class CoursesUserController {
  constructor(private readonly courseUserService: CourseUserService) {}

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    description: 'Returns user courses and session data.',
  })
  @UseGuards(FirebaseAuthGuard)
  async getCourseUserByUserId(@Req() req: Request): Promise<ICoursesWithSessions[]> {
    const user = req['userEntity'] as UserEntity;
    const coursesUser = await this.courseUserService.getCourseUserByUserId(user.id);
    return formatCourseUserObjects(coursesUser);
  }
}
