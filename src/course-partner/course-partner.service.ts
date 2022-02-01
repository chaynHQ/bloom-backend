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

  async updateCoursePartners(partners: string[], courseId: string) {
    const partnersObjects = await Promise.all(
      partners.map(async (partner) => {
        if (partner === 'public' || partner === 'Public') return null;
        return await await this.partnerService.getPartner(partner);
      }),
    );

    return await Promise.all(
      partnersObjects.map(async (partnerObject) => {
        const coursePartner = await this.coursePartnerRepository.findOne({
          partnerId: partnerObject.id,
          courseId: courseId,
        });

        if (!coursePartner) {
          const coursePartnerObject = this.coursePartnerRepository.create({
            partnerId: partnerObject.id,
            courseId,
          });
          await this.coursePartnerRepository.save(coursePartnerObject);
        }
      }),
    );
  }
}
