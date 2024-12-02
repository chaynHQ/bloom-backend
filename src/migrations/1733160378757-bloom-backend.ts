import { MigrationInterface, QueryRunner } from "typeorm";

export class BloomBackend1733160378757 implements MigrationInterface {
    name = 'BloomBackend1733160378757'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "resource_feedback" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "resourceFeedbackId" uuid NOT NULL DEFAULT uuid_generate_v4(), "resourceId" uuid NOT NULL, "feedbackTags" character varying NOT NULL, "feedbackDescription" character varying NOT NULL, CONSTRAINT "PK_97393ce3b5c5d462500e181613b" PRIMARY KEY ("resourceFeedbackId"))`);
        await queryRunner.query(`CREATE TABLE "resource" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "resourceId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "status" character varying, "category" character varying NOT NULL, "storyblokUuid" character varying NOT NULL, "storyblokId" integer NOT NULL, CONSTRAINT "UQ_575686fbc2bc272030a15ac3ea1" UNIQUE ("storyblokUuid"), CONSTRAINT "UQ_1b4b84228b725114ccc955dcec7" UNIQUE ("storyblokId"), CONSTRAINT "PK_f59f8360a61e63c72d0f1a6aa00" PRIMARY KEY ("resourceId"))`);
        await queryRunner.query(`CREATE TABLE "resource_user" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "resourceUserId" uuid NOT NULL DEFAULT uuid_generate_v4(), "completedAt" date, "resourceId" uuid, "userId" uuid, CONSTRAINT "PK_e88a671cf058fac35384d8e1426" PRIMARY KEY ("resourceUserId"))`);
        await queryRunner.query(`ALTER TABLE "session_feedback" DROP CONSTRAINT "FK_a0567dbf6bd30cf4bd05b110a17"`);
        await queryRunner.query(`ALTER TABLE "session_feedback" ALTER COLUMN "sessionId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "session_feedback" ADD CONSTRAINT "FK_a0567dbf6bd30cf4bd05b110a17" FOREIGN KEY ("sessionId") REFERENCES "session"("sessionId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "resource_feedback" ADD CONSTRAINT "FK_3218ac4ae760f580ce260a43e3a" FOREIGN KEY ("resourceId") REFERENCES "resource"("resourceId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "resource_user" ADD CONSTRAINT "FK_774b61a463074cee88e57685925" FOREIGN KEY ("resourceId") REFERENCES "resource"("resourceId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "resource_user" ADD CONSTRAINT "FK_ea89e3c7f0126d7e9d02308c2ca" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "resource_user" DROP CONSTRAINT "FK_ea89e3c7f0126d7e9d02308c2ca"`);
        await queryRunner.query(`ALTER TABLE "resource_user" DROP CONSTRAINT "FK_774b61a463074cee88e57685925"`);
        await queryRunner.query(`ALTER TABLE "resource_feedback" DROP CONSTRAINT "FK_3218ac4ae760f580ce260a43e3a"`);
        await queryRunner.query(`ALTER TABLE "session_feedback" DROP CONSTRAINT "FK_a0567dbf6bd30cf4bd05b110a17"`);
        await queryRunner.query(`ALTER TABLE "session_feedback" ALTER COLUMN "sessionId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "session_feedback" ADD CONSTRAINT "FK_a0567dbf6bd30cf4bd05b110a17" FOREIGN KEY ("sessionId") REFERENCES "session"("sessionId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`DROP TABLE "resource_user"`);
        await queryRunner.query(`DROP TABLE "resource"`);
        await queryRunner.query(`DROP TABLE "resource_feedback"`);
    }

}
