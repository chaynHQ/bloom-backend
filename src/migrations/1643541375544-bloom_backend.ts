import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1643541375544 implements MigrationInterface {
    name = 'bloomBackend1643541375544'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course_partner" ADD "active" boolean NOT NULL`);
        await queryRunner.query(`ALTER TABLE "session_user" ADD CONSTRAINT "session_user_index_name" UNIQUE ("courseUserId", "sessionId")`);
        await queryRunner.query(`ALTER TABLE "course_user" ADD CONSTRAINT "course_user_index_name" UNIQUE ("userId", "courseId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course_user" DROP CONSTRAINT "course_user_index_name"`);
        await queryRunner.query(`ALTER TABLE "session_user" DROP CONSTRAINT "session_user_index_name"`);
        await queryRunner.query(`ALTER TABLE "course_partner" DROP COLUMN "active"`);
    }

}
