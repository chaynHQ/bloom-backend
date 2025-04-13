import { MigrationInterface, QueryRunner } from "typeorm";

export class BloomBackend1744450013565 implements MigrationInterface {
    name = 'BloomBackend1744450013565'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "user" SET "deletedAt" = "updatedAt" WHERE "isActive" = false AND "deletedAt" IS NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "user" SET "deletedAt" = null WHERE "isActive" = false`);
    }

}
