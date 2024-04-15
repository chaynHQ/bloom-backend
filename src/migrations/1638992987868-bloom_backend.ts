import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1638992987868 implements MigrationInterface {
  name = 'bloomBackend1638992987868';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "isSuperAdmin" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isSuperAdmin"`);
  }
}
