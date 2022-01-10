import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1641837229263 implements MigrationInterface {
    name = 'bloomBackend1641837229263'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "active"`);
        await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "storyBlokId"`);
        await queryRunner.query(`ALTER TABLE "session" ADD "status" character varying`);
        await queryRunner.query(`ALTER TABLE "session" ADD CONSTRAINT "UQ_6becf4504fe1ca053090582684a" UNIQUE ("status")`);
        await queryRunner.query(`ALTER TABLE "session" ADD "storyblokid" character varying`);
        await queryRunner.query(`ALTER TABLE "session" ADD CONSTRAINT "UQ_dd7dba87c3823edeec1f8f390fd" UNIQUE ("storyblokid")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session" DROP CONSTRAINT "UQ_dd7dba87c3823edeec1f8f390fd"`);
        await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "storyblokid"`);
        await queryRunner.query(`ALTER TABLE "session" DROP CONSTRAINT "UQ_6becf4504fe1ca053090582684a"`);
        await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "session" ADD "storyBlokId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "session" ADD "active" boolean NOT NULL`);
    }

}
