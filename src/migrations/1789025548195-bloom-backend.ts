import { MigrationInterface, QueryRunner } from 'typeorm';

// Fold legacy short_video/single_video/conversation into video/audio, then convert
// resource.category to the resource_category_enum PG type. down() is lossy.
export class BloomBackend1789025548195 implements MigrationInterface {
  name = 'BloomBackend1789025548195';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM "resource" WHERE "category" NOT IN
            ('short_video', 'single_video', 'conversation', 'video', 'audio', 'written', 'activity', 'grounding')
        ) THEN
          RAISE EXCEPTION 'unexpected resource.category value';
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `UPDATE "resource" SET "category" = 'video' WHERE "category" IN ('short_video', 'single_video')`,
    );
    await queryRunner.query(
      `UPDATE "resource" SET "category" = 'audio' WHERE "category" = 'conversation'`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."resource_category_enum" AS ENUM('video', 'audio', 'written', 'activity', 'grounding')`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource" ALTER COLUMN "category" TYPE "public"."resource_category_enum" USING "category"::text::"public"."resource_category_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "resource" ALTER COLUMN "category" TYPE character varying USING "category"::text`,
    );
    await queryRunner.query(`DROP TYPE "public"."resource_category_enum"`);
    await queryRunner.query(
      `UPDATE "resource" SET "category" = 'single_video' WHERE "category" = 'video'`,
    );
    await queryRunner.query(
      `UPDATE "resource" SET "category" = 'conversation' WHERE "category" = 'audio'`,
    );
  }
}
