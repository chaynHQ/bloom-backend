import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1643057543319 implements MigrationInterface {
    name = 'bloomBackend1643057543319'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session" ADD "parent_id" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "parent_id"`);
    }

}
