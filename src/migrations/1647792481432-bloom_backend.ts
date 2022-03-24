import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1647792481432 implements MigrationInterface {
    name = 'bloomBackend1647792481432'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isActive"`);
    }

}
