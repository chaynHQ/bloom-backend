import { MigrationInterface, QueryRunner } from "typeorm";

export class BloomBackend1718728423454 implements MigrationInterface {
    name = 'BloomBackend1718728423454'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "emailRemindersFrequency" character varying NOT NULL DEFAULT 'NEVER'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "emailRemindersFrequency"`);
    }

}
