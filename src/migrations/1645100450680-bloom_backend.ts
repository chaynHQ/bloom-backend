import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1645100450680 implements MigrationInterface {
  name = 'bloomBackend1645100450680';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partner_access" ADD "active" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "partner_access" DROP COLUMN "active"`);
  }
}
