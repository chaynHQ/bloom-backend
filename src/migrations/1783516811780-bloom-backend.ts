import { MigrationInterface, QueryRunner } from 'typeorm';

export class BloomBackend1783516811780 implements MigrationInterface {
  name = 'BloomBackend1783516811780';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."session_themes_enum" AS ENUM('recognising-harm', 'why-harm-happens', 'body-after-trauma', 'setting-boundaries', 'healing-journey', 'staying-safe')`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" ADD "themes" "public"."session_themes_enum" array`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."course_themes_enum" AS ENUM('recognising-harm', 'why-harm-happens', 'body-after-trauma', 'setting-boundaries', 'healing-journey', 'staying-safe')`,
    );
    await queryRunner.query(`ALTER TABLE "course" ADD "themes" "public"."course_themes_enum" array`);
    await queryRunner.query(
      `CREATE TYPE "public"."resource_themes_enum" AS ENUM('recognising-harm', 'why-harm-happens', 'body-after-trauma', 'setting-boundaries', 'healing-journey', 'staying-safe')`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource" ADD "themes" "public"."resource_themes_enum" array`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "resource" DROP COLUMN "themes"`);
    await queryRunner.query(`DROP TYPE "public"."resource_themes_enum"`);
    await queryRunner.query(`ALTER TABLE "course" DROP COLUMN "themes"`);
    await queryRunner.query(`DROP TYPE "public"."course_themes_enum"`);
    await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "themes"`);
    await queryRunner.query(`DROP TYPE "public"."session_themes_enum"`);
  }
}
