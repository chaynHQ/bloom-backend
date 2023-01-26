import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1674744864331 implements MigrationInterface {
  name = 'bloomBackend1674744864331';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_user" ADD "subscriptionInfo" character varying NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscription_user" DROP COLUMN "subscriptionInfo"`);
  }
}
