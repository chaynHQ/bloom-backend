import { MigrationInterface, QueryRunner } from "typeorm";

export class BloomBackend1779520895360 implements MigrationInterface {
    name = 'BloomBackend1779520895360'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_user" DROP CONSTRAINT "FK_chat_user_userId"`);
        await queryRunner.query(`ALTER TABLE "session_feedback" DROP CONSTRAINT "FK_a0567dbf6bd30cf4bd05b110a17"`);
        await queryRunner.query(`ALTER TABLE "session_feedback" ALTER COLUMN "sessionId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "partner_access" ALTER COLUMN "accessCode" DROP NOT NULL`);
        await queryRunner.query(`ALTER TYPE "public"."chat_user_unreadnotificationstatus_enum" RENAME TO "chat_user_unreadnotificationstatus_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."chat_user_unreadnotificationstatus_enum" AS ENUM('PENDING', 'SENT', 'FAILED', 'BOUNCED', 'CLEANED')`);
        await queryRunner.query(`ALTER TABLE "chat_user" ALTER COLUMN "unreadNotificationStatus" TYPE "public"."chat_user_unreadnotificationstatus_enum" USING "unreadNotificationStatus"::"text"::"public"."chat_user_unreadnotificationstatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."chat_user_unreadnotificationstatus_enum_old"`);
        await queryRunner.query(`ALTER TABLE "session_feedback" ADD CONSTRAINT "FK_a0567dbf6bd30cf4bd05b110a17" FOREIGN KEY ("sessionId") REFERENCES "session"("sessionId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_user" ADD CONSTRAINT "FK_5e9874ea3bd3524db95c2d88e53" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_user" DROP CONSTRAINT "FK_5e9874ea3bd3524db95c2d88e53"`);
        await queryRunner.query(`ALTER TABLE "session_feedback" DROP CONSTRAINT "FK_a0567dbf6bd30cf4bd05b110a17"`);
        await queryRunner.query(`CREATE TYPE "public"."chat_user_unreadnotificationstatus_enum_old" AS ENUM('PENDING', 'SENT', 'FAILED', 'BOUNCED', 'CLEANED')`);
        await queryRunner.query(`ALTER TABLE "chat_user" ALTER COLUMN "unreadNotificationStatus" TYPE "public"."chat_user_unreadnotificationstatus_enum_old" USING "unreadNotificationStatus"::"text"::"public"."chat_user_unreadnotificationstatus_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."chat_user_unreadnotificationstatus_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."chat_user_unreadnotificationstatus_enum_old" RENAME TO "chat_user_unreadnotificationstatus_enum"`);
        await queryRunner.query(`ALTER TABLE "partner_access" ALTER COLUMN "accessCode" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "session_feedback" ALTER COLUMN "sessionId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "session_feedback" ADD CONSTRAINT "FK_a0567dbf6bd30cf4bd05b110a17" FOREIGN KEY ("sessionId") REFERENCES "session"("sessionId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_user" ADD CONSTRAINT "FK_chat_user_userId" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
