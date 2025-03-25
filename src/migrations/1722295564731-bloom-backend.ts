import { MigrationInterface, QueryRunner } from 'typeorm';

export class BloomBackend1722295564731 implements MigrationInterface {
  name = 'BloomBackend1722295564731';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "deletedAt" TIMESTAMP WITH TIME ZONE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "deletedAt"`);
  }
}
