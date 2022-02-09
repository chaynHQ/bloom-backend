import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1644400679575 implements MigrationInterface {
    name = 'bloomBackend1644400679575'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session_user" ADD "completedAt" character varying`);
        await queryRunner.query(`ALTER TABLE "course_user" ADD "completedAt" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course_user" DROP COLUMN "completedAt"`);
        await queryRunner.query(`ALTER TABLE "session_user" DROP COLUMN "completedAt"`);
    }

}
