import { TherapyFeedbackEntity } from 'src/entities/therapy-feedback.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(TherapyFeedbackEntity)
export class TherapyFeedbackRepository extends Repository<TherapyFeedbackEntity> {}
