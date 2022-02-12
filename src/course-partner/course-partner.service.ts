import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import _ from 'lodash';
import { PartnerService } from 'src/partner/partner.service';
import { CoursePartnerRepository } from './course-partner.repository';

@Injectable()
export class CoursePartnerService {
  constructor(
    @InjectRepository(CoursePartnerRepository)
    private coursePartnerRepository: CoursePartnerRepository,
    private readonly partnerService: PartnerService,
  ) {}

  async getCoursePartnersByCourseId(courseId: string) {
    return await this.coursePartnerRepository
      .createQueryBuilder('course_partner')
      .leftJoinAndSelect('course_partner.partner', 'partner')
      .where('course_partner.courseId = :courseId', { courseId })
      .getMany();
  }

  async updateCoursePartners(partners: string[], courseId: string) {
    const coursePartners = await this.getCoursePartnersByCourseId(courseId);

    const partnersObjects = await Promise.all(
      partners.map(async (partner) => {
        if (partner === 'public' || partner === 'Public') return;
        return await this.partnerService.getPartner(partner);
      }),
    );

    const coursePartnersIds = [];
    //If course existed in included_for_partners but now doesnt
    Promise.all(
      coursePartners.map(async (cp) => {
        coursePartnersIds.push(cp.partner.id);
        if (!_.find(partnersObjects, { id: cp.partner.id })) {
          cp.active = false;
          await this.coursePartnerRepository.save(cp);
        }
      }),
    );

    return Promise.all(
      partnersObjects.map(async (partner) => {
        if (coursePartnersIds.indexOf(partner.id) === -1) {
          await this.coursePartnerRepository.save({
            partnerId: partner.id,
            courseId,
            active: true,
          });
        } else {
          const coursePartner = coursePartners.find((cp) => cp.partner.id === partner.id);
          if (!!coursePartner && coursePartner.active === false) {
            //If course was removed from included_for_partners but was added back at a later date
            coursePartner.active = true;
            await this.coursePartnerRepository.save(coursePartner);
          }
        }
      }),
    );
  }
}
