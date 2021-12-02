import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(PartnerAccessEntity)
export class PartnerAccessRepository extends Repository<PartnerAccessEntity> {}
