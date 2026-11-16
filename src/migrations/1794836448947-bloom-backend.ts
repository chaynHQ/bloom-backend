import { MigrationInterface, QueryRunner } from 'typeorm';

// Add-only, so the previous backend still runs against this schema: the branding columns
// removed from PartnerEntity stay in the database until a later migration drops them.
export class BloomBackend1794836448947 implements MigrationInterface {
  name = 'BloomBackend1794836448947';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "partner" ADD "slug" character varying`);
    // Same as slugify() in src/partner/slugify.ts. If two names slugify alike, the unique
    // constraint below fails the migration rather than guessing.
    await queryRunner.query(
      `UPDATE "partner" SET "slug" = trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g'))`,
    );
    await queryRunner.query(`ALTER TABLE "partner" ALTER COLUMN "slug" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "partner" ADD CONSTRAINT "UQ_26fab9e1f50dcdc0281ec087cac" UNIQUE ("slug")`,
    );
    await queryRunner.query(`ALTER TABLE "partner" ADD "storyblokUuid" character varying`);
    await queryRunner.query(
      `ALTER TABLE "partner" ADD CONSTRAINT "UQ_94e53f30f11ba958a563bbacf96" UNIQUE ("storyblokUuid")`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner" ADD "therapySessionsPerCode" integer NOT NULL DEFAULT '0'`,
    );
    // Existing partners keep the 6 sessions that @Max(6) allowed; new partners start at 0
    await queryRunner.query(`UPDATE "partner" SET "therapySessionsPerCode" = 6`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "therapySessionsPerCode"`);
    await queryRunner.query(
      `ALTER TABLE "partner" DROP CONSTRAINT "UQ_94e53f30f11ba958a563bbacf96"`,
    );
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "storyblokUuid"`);
    await queryRunner.query(
      `ALTER TABLE "partner" DROP CONSTRAINT "UQ_26fab9e1f50dcdc0281ec087cac"`,
    );
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "slug"`);
  }
}
