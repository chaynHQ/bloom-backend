import { MigrationInterface, QueryRunner } from "typeorm";

export class BloomBackend1719668310816 implements MigrationInterface {
    name = 'BloomBackend1719668310816'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "session_feedback" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sessionFeedbackId" uuid NOT NULL DEFAULT uuid_generate_v4(), "sessionId" uuid NOT NULL, "feedbackTags" character varying NOT NULL, "feedbackDescription" character varying NOT NULL, CONSTRAINT "PK_fa9bf9afa42e7a30230cf243090" PRIMARY KEY ("sessionFeedbackId"))`);
        await queryRunner.query(`ALTER TABLE "session_feedback" ADD CONSTRAINT "FK_a0567dbf6bd30cf4bd05b110a17" FOREIGN KEY ("sessionId") REFERENCES "session"("sessionId") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session_feedback" DROP CONSTRAINT "FK_a0567dbf6bd30cf4bd05b110a17"`);
        await queryRunner.query(`DROP TABLE "session_feedback"`);
    }

}
