import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerService } from 'src/partner/partner.service';
import { CoursePartnerRepository } from './course-partner.repository';

@Injectable()
export class CoursePartnerService {
  constructor(
    @InjectRepository(CoursePartnerRepository)
    private coursePartnerRepository: CoursePartnerRepository,
    private readonly partnerService: PartnerService,
  ) {}

  async createCoursePartner(partners: string[], action, courseId: string) {
    const partnersObjects = await Promise.all(
      partners.map(async (partner) => {
        if (partner === 'public' || partner === 'Public') return null;
        return await await this.partnerService.getPartner(partner);
      }),
    );

    return await Promise.all(
      partnersObjects.map(async (partnerObject) => {
        const createCoursePartnerObject = this.coursePartnerRepository.create({
          partnerId: partnerObject.id,
          courseId,
          status: action,
        });

        const coursePartner = await this.coursePartnerRepository.findOne({
          partnerId: partnerObject.id,
          courseId: courseId,
        });
        coursePartner.status = action;

        await this.coursePartnerRepository.save(
          !!coursePartner ? coursePartner : createCoursePartnerObject,
        );
      }),
    );
  }
}
