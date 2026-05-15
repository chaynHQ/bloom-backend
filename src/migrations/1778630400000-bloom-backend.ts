import { MigrationInterface, QueryRunner } from 'typeorm';

export class BloomBackend1778630400000 implements MigrationInterface {
  name = 'BloomBackend1778630400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "chat_user_unreadnotificationstatus_enum" AS ENUM (
        'pending', 'sent', 'failed', 'bounced', 'cleaned'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_user"
        RENAME COLUMN "lastUnreadNotifiedAt" TO "unreadNotificationAttemptedAt"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_user"
        ADD COLUMN "unreadNotificationStatus" "chat_user_unreadnotificationstatus_enum",
        ADD COLUMN "unreadNotificationError" character varying,
        ADD COLUMN "unreadNotificationAttempts" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_user"
        DROP COLUMN "unreadNotificationStatus",
        DROP COLUMN "unreadNotificationError",
        DROP COLUMN "unreadNotificationAttempts"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_user"
        RENAME COLUMN "unreadNotificationAttemptedAt" TO "lastUnreadNotifiedAt"
    `);
    await queryRunner.query(`DROP TYPE "chat_user_unreadnotificationstatus_enum"`);
  }
}
