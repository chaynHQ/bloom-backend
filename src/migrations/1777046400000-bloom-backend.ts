import { MigrationInterface, QueryRunner } from 'typeorm';

export class BloomBackend1777046400000 implements MigrationInterface {
  name = 'BloomBackend1777046400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reporting_run"
        ADD COLUMN "whatsappSubscribed" integer,
        ADD COLUMN "whatsappUnsubscribed" integer,
        ADD COLUMN "resourcesStarted" integer,
        ADD COLUMN "resourcesCompleted" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reporting_run"
        DROP COLUMN "whatsappSubscribed",
        DROP COLUMN "whatsappUnsubscribed",
        DROP COLUMN "resourcesStarted",
        DROP COLUMN "resourcesCompleted"`,
    );
  }
}
