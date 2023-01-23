import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1674468906787 implements MigrationInterface {
  name = 'bloomBackend1674468906787';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "subscription" ("subscriptionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, CONSTRAINT "UQ_9e5c9733b3b3d58f3d3e7ef8078" UNIQUE ("name"), CONSTRAINT "PK_13cecd7da6abc7ae934d8560bef" PRIMARY KEY ("subscriptionId"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "subscription"`);
  }
}
