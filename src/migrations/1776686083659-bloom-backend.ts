import { MigrationInterface, QueryRunner } from 'typeorm';

export class BloomBackend1776686083659 implements MigrationInterface {
  name = 'BloomBackend1776686083659';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "reporting_run" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "periodType" character varying NOT NULL,
        "periodStart" TIMESTAMP WITH TIME ZONE NOT NULL,
        "periodEnd" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "error" text,
        "slackResponse" jsonb,

        -- DB metrics snapshot. Nullable because rows are inserted in 'pending'
        -- state before metrics are collected; populated when status flips to 'sent'.
        "newUsers" integer,
        "deletedUsers" integer,
        "coursesStarted" integer,
        "coursesCompleted" integer,
        "sessionsStarted" integer,
        "sessionsCompleted" integer,
        "therapyBookingsBooked" integer,
        "therapyBookingsCancelled" integer,
        "therapyBookingsScheduledForPeriod" integer,
        "partnerAccessGrants" integer,
        "partnerAccessActivations" integer,

        -- GA4 metrics snapshot. jsonb because shape is variable (event list
        -- and breakdown rows are heterogeneous).
        "ga4Overview" jsonb,
        "ga4Events" jsonb,
        "ga4Breakdowns" jsonb,
        "ga4EventBreakdowns" jsonb,

        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reporting_run" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_reporting_run_slot" UNIQUE ("periodType", "periodStart")
      )`,
    );

    // Index for the "previous run" lookup used by % delta calculations —
    // the unique constraint already provides a (periodType, periodStart) btree,
    // but an explicit one on just periodType lets us scan recent-by-status fast.
    await queryRunner.query(
      `CREATE INDEX "IDX_reporting_run_type_start" ON "reporting_run" ("periodType", "periodStart" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reporting_run_type_start"`);
    await queryRunner.query(`DROP TABLE "reporting_run"`);
  }
}
