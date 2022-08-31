import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1661973464713 implements MigrationInterface {
  name = 'bloomBackend1661973464713';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_campaign" DROP CONSTRAINT "UQ_e510ab9687d29667a0c49c57a0e"`,
    );
    await queryRunner.query(`ALTER TABLE "email_campaign" DROP COLUMN "campaignInfo"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_campaign" ADD "campaignInfo" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_campaign" ADD CONSTRAINT "UQ_e510ab9687d29667a0c49c57a0e" UNIQUE ("campaignInfo")`,
    );
  }
}
