import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getManager } from 'typeorm';
import { CoursePartnerRepository } from './course-partner.repository';

@Injectable()
export class CoursePartnerService {
  constructor(
    @InjectRepository(CoursePartnerRepository)
    private CoursePartnerRepository: CoursePartnerRepository,
  ) {}

  async createCoursePartner(partners: string[]) {
    return await getManager().query(`WITH "course_user_alias" AS (
              INSERT INTO "course_user"("createdAt", "updatedAt", "CoursePartnerId", "completed", "userId", "courseId") 
              VALUES (DEFAULT, DEFAULT, DEFAULT, false, '${userId}', '${courseId}') 
              ON CONFLICT DO NOTHING
              RETURNING * )
                SELECT * FROM "course_user_alias" UNION SELECT * FROM "course_user" 
                WHERE "userId"='${userId}' AND "courseId"='${courseId}'`);
  }
}
