import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1675351569206 implements MigrationInterface {
  name = 'bloomBackend1675351569206';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partner_feature" ADD CONSTRAINT "partner_feature_index_name" UNIQUE ("partnerId", "featureId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partner_feature" DROP CONSTRAINT "partner_feature_index_name"`,
    );
  }
}
