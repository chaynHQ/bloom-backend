import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1658221497716 implements MigrationInterface {
  name = 'bloomBackend1658221497716';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "crispTokenId" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_64c33fea871de4f4b78e5976c22" UNIQUE ("crispTokenId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_64c33fea871de4f4b78e5976c22"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "crispTokenId"`);
  }
}
