import { MigrationInterface, QueryRunner } from 'typeorm';

export class BloomBackend1718300621138 implements MigrationInterface {
  name = 'BloomBackend1718300621138';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "lastActiveAt" TIMESTAMP WITH TIME ZONE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "lastActiveAt"`);
  }
}
