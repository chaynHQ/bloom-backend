import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1669898747823 implements MigrationInterface {
    name = 'bloomBackend1669898747823'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "signUpLanguage" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "signUpLanguage"`);
    }

}
