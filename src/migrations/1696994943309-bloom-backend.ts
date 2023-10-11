import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1696994943309 implements MigrationInterface {
  name = 'bloomBackend1696994943309';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partner_admin" ADD "active" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "partner_admin" DROP COLUMN "active"`);
  }
}
