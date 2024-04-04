import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1712075874403 implements MigrationInterface {
  name = 'bloomBackend1712075874403';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "email_campaign"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "email_campaign" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "campaignType" character varying NOT NULL, "email" character varying NOT NULL, "emailSentDateTime" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_140462ad4b82245fec89e5a3976" PRIMARY KEY ("id"))`,
    );
  }
}
