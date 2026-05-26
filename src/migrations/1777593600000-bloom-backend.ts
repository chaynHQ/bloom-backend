import { MigrationInterface, QueryRunner } from 'typeorm';

export class BloomBackend1777593600000 implements MigrationInterface {
  name = 'BloomBackend1777593600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reporting_run"
        ADD COLUMN "sessionFeedbackSubmitted" integer,
        ADD COLUMN "resourceFeedbackSubmitted" integer,
        ADD COLUMN "activationRate" integer,
        ADD COLUMN "partnerActivationRate" integer,
        ADD COLUMN "periodTimezone" varchar(64),
        ADD COLUMN "dbBreakdowns" jsonb,
        ADD COLUMN "dbTotals" jsonb,
        ADD COLUMN "anomalies" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reporting_run"
        DROP COLUMN "sessionFeedbackSubmitted",
        DROP COLUMN "resourceFeedbackSubmitted",
        DROP COLUMN "activationRate",
        DROP COLUMN "partnerActivationRate",
        DROP COLUMN "periodTimezone",
        DROP COLUMN "dbBreakdowns",
        DROP COLUMN "dbTotals",
        DROP COLUMN "anomalies"`,
    );
  }
}
