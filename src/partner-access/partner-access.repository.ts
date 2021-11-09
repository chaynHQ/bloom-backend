import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(PartnerAccessEntity)
export class PartnerAccessRepository extends Repository<PartnerAccessEntity> {}
