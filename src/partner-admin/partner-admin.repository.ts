import { PartnerAdminEntity } from '../entities/partner-admin.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(PartnerAdminEntity)
export class PartnerAdminRepository extends Repository<PartnerAdminEntity> {}
