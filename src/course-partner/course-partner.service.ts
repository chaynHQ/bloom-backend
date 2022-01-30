import { Injectable } from '@nestjs/common';
import { PartnerService } from 'src/partner/partner.service';
import { getManager } from 'typeorm';

@Injectable()
export class CoursePartnerService {
  constructor(private readonly partnerService: PartnerService) {}

  async createCoursePartner(partners: string[], action, courseId: string) {
    const partnerObjects = await Promise.all(
      partners.map(async (partner) => {
        if (partner === 'public' || partner === 'Public') return null;
        return await (
          await this.partnerService.getPartner(partner)
        ).id;
      }),
    );

    return await Promise.all(
      partnerObjects.map(async (partnerObject) => {
        return await getManager().query(`WITH "course_partner_alias" AS (
              INSERT INTO "course_partner"("createdAt", "updatedAt", "coursePartnerId", "status", "partnerId", "courseId")
              VALUES (DEFAULT, DEFAULT, DEFAULT, '${action}', ${
          partnerObject === null ? null : `'${partnerObject}'`
        }, '${courseId}')
              ON CONFLICT ON CONSTRAINT course_partner_index_name DO UPDATE SET status = '${action}'
              RETURNING * )
                SELECT * FROM "course_partner_alias" UNION SELECT * FROM "course_partner"
                WHERE "partnerId"=${
                  partnerObject === null ? null : `'${partnerObject}'`
                } AND "courseId"='${courseId}'`);
      }),
    );
  }
}
