import { SimplyBookEntity } from 'src/entities/simply-book.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(SimplyBookEntity)
export class SimplyBookRepository extends Repository<SimplyBookEntity> {}
