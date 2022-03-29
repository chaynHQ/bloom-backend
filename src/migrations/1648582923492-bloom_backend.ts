import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1648582923492 implements MigrationInterface {
    name = 'bloomBackend1648582923492'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" RENAME COLUMN "languageDefault" TO "isActive"`);
        await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "logo"`);
        await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "primaryColour"`);
        await queryRunner.query(`ALTER TABLE "partner" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "isActive" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "partner" ADD "primaryColour" character varying`);
        await queryRunner.query(`ALTER TABLE "partner" ADD "logo" character varying`);
        await queryRunner.query(`ALTER TABLE "user" RENAME COLUMN "isActive" TO "languageDefault"`);
    }

}
