import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1643132905509 implements MigrationInterface {
    name = 'bloomBackend1643132905509'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session_user" ADD CONSTRAINT "session_user_index_name" UNIQUE ("courseUserId", "sessionId")`);
        await queryRunner.query(`ALTER TABLE "course_user" ADD CONSTRAINT "course_user_index_name" UNIQUE ("userId", "courseId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course_user" DROP CONSTRAINT "course_user_index_name"`);
        await queryRunner.query(`ALTER TABLE "session_user" DROP CONSTRAINT "session_user_index_name"`);
    }

}
