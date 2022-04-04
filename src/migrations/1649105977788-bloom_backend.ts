import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1649105977788 implements MigrationInterface {
    name = 'bloomBackend1649105977788'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partner" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "isActive"`);
    }

}
