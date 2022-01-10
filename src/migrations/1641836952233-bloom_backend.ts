import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1641836952233 implements MigrationInterface {
    name = 'bloomBackend1641836952233'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course" RENAME COLUMN "active" TO "status"`);
        await queryRunner.query(`ALTER TABLE "course" RENAME CONSTRAINT "UQ_169ed1ea571601b11c1b40f20a4" TO "UQ_baccb82c6179dca139f6b8c7680"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course" RENAME CONSTRAINT "UQ_baccb82c6179dca139f6b8c7680" TO "UQ_169ed1ea571601b11c1b40f20a4"`);
        await queryRunner.query(`ALTER TABLE "course" RENAME COLUMN "status" TO "active"`);
    }

}
