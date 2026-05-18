import { MigrationInterface, QueryRunner } from 'typeorm';

export class BloomBackend1779235200000 implements MigrationInterface {
  name = 'BloomBackend1779235200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reporting_run"
        ADD COLUMN "slackTs" varchar(32),
        ADD COLUMN "activeUsers" integer,
        ADD COLUMN "newPartnerUsers" integer,
        ADD COLUMN "messagesSent" integer,
        ADD COLUMN "messagesReceived" integer,
        DROP COLUMN IF EXISTS "dbTotals",
        DROP COLUMN IF EXISTS "activationRate",
        DROP COLUMN IF EXISTS "partnerActivationRate"`,
    );
    // `therapyBookingsScheduledForPeriod` is renamed to `therapySessionsCompleted`:
    // same query (startDateTime in window AND action != cancelled) but more
    // accurately described as the best proxy for sessions actually delivered.
    await queryRunner.query(
      `ALTER TABLE "reporting_run"
        RENAME COLUMN "therapyBookingsScheduledForPeriod" TO "therapySessionsCompleted"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Idempotent rename: only run if the renamed column exists. Lets this
    // down() succeed whether or not the up() rename was applied.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'reporting_run' AND column_name = 'therapySessionsCompleted'
        ) THEN
          ALTER TABLE "reporting_run"
            RENAME COLUMN "therapySessionsCompleted" TO "therapyBookingsScheduledForPeriod";
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `ALTER TABLE "reporting_run"
        DROP COLUMN IF EXISTS "slackTs",
        DROP COLUMN IF EXISTS "activeUsers",
        DROP COLUMN IF EXISTS "newPartnerUsers",
        DROP COLUMN IF EXISTS "messagesSent",
        DROP COLUMN IF EXISTS "messagesReceived",
        ADD COLUMN IF NOT EXISTS "dbTotals" jsonb,
        ADD COLUMN IF NOT EXISTS "activationRate" integer,
        ADD COLUMN IF NOT EXISTS "partnerActivationRate" integer`,
    );
  }
}
