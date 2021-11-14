import { PartnerEntity } from '../entities/partner.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(PartnerEntity)
export class PartnerRepository extends Repository<PartnerEntity> {}
