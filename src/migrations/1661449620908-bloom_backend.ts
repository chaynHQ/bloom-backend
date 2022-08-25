import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1661449620908 implements MigrationInterface {
  name = 'bloomBackend1661449620908';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "email_campaign" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "campaignType" character varying NOT NULL, "campaignInfo" character varying NOT NULL, "email" character varying NOT NULL, "emailSentDateTime" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_e510ab9687d29667a0c49c57a0e" UNIQUE ("campaignInfo"), CONSTRAINT "PK_140462ad4b82245fec89e5a3976" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "email_campaign"`);
  }
}
