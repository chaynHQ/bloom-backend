import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1680797056762 implements MigrationInterface {
  name = 'bloomBackend1680797056762';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partner_access" DROP CONSTRAINT "REL_25e7860a2eec1f9366fcfe3a95"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partner_access" ADD CONSTRAINT "REL_25e7860a2eec1f9366fcfe3a95" UNIQUE ("userId")`,
    );
  }
}
