import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1637687211494 implements MigrationInterface {
    name = 'bloomBackend1637687211494'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "contactPermission" boolean NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "contactPermission"`);
    }

}
