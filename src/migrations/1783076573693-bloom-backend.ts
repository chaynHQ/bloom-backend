import { MigrationInterface, QueryRunner } from "typeorm";

export class BloomBackend1783076573693 implements MigrationInterface {
    name = 'BloomBackend1783076573693'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partner_access" ALTER COLUMN "accessCode" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partner_access" ALTER COLUMN "accessCode" SET NOT NULL`);
    }

}
