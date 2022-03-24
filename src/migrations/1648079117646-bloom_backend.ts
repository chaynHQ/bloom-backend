import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1648079117646 implements MigrationInterface {
  name = 'bloomBackend1648079117646';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "languageDefault"`);
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "logo"`);
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "primaryColour"`);
    await queryRunner.query(`ALTER TABLE "user" ADD "isActive" boolean NOT NULL DEFAULT true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isActive"`);
    await queryRunner.query(`ALTER TABLE "partner" ADD "primaryColour" character varying`);
    await queryRunner.query(`ALTER TABLE "partner" ADD "logo" character varying`);
    await queryRunner.query(`ALTER TABLE "user" ADD "languageDefault" character varying NOT NULL`);
  }
}
