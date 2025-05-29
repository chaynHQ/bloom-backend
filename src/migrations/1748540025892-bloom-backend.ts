import { MigrationInterface, QueryRunner } from "typeorm";

export class BloomBackend1748540025892 implements MigrationInterface {
    name = 'BloomBackend1748540025892'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "therapy_session" ADD "bookingId" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "therapy_session" DROP COLUMN "bookingId"`);
    }

}
