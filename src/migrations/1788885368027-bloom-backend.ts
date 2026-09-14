import { MigrationInterface, QueryRunner } from 'typeorm';

// Rename the two "harm" library themes to "abuse" across the three themes enums.
// ALTER TYPE ... RENAME VALUE renames the label in place, so existing course/session/
// resource rows keep pointing at the same enum member — no data backfill needed.
export class BloomBackend1788885368027 implements MigrationInterface {
  name = 'BloomBackend1788885368027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const type of ['session_themes_enum', 'course_themes_enum', 'resource_themes_enum']) {
      await queryRunner.query(
        `ALTER TYPE "public"."${type}" RENAME VALUE 'recognising-harm' TO 'recognising-abuse'`,
      );
      await queryRunner.query(
        `ALTER TYPE "public"."${type}" RENAME VALUE 'why-harm-happens' TO 'why-abuse-happens'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const type of ['session_themes_enum', 'course_themes_enum', 'resource_themes_enum']) {
      await queryRunner.query(
        `ALTER TYPE "public"."${type}" RENAME VALUE 'recognising-abuse' TO 'recognising-harm'`,
      );
      await queryRunner.query(
        `ALTER TYPE "public"."${type}" RENAME VALUE 'why-abuse-happens' TO 'why-harm-happens'`,
      );
    }
  }
}
