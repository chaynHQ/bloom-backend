import { PartnerEntity } from 'src/entities/partner.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(PartnerEntity)
export class PartnerRepository extends Repository<PartnerEntity> {}
