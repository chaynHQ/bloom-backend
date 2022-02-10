import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1644454107834 implements MigrationInterface {
    name = 'bloomBackend1644454107834'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session_user" DROP COLUMN "completedAt"`);
        await queryRunner.query(`ALTER TABLE "session_user" ADD "completedAt" date`);
        await queryRunner.query(`ALTER TABLE "course_user" DROP COLUMN "completedAt"`);
        await queryRunner.query(`ALTER TABLE "course_user" ADD "completedAt" date`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course_user" DROP COLUMN "completedAt"`);
        await queryRunner.query(`ALTER TABLE "course_user" ADD "completedAt" character varying`);
        await queryRunner.query(`ALTER TABLE "session_user" DROP COLUMN "completedAt"`);
        await queryRunner.query(`ALTER TABLE "session_user" ADD "completedAt" character varying`);
    }

}
