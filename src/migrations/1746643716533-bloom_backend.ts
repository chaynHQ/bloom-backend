import { MigrationInterface, QueryRunner } from "typeorm";

export class BloomBackend1746643716533 implements MigrationInterface {
    name = 'BloomBackend1746643716533'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course" DROP COLUMN "storyblokId"`);
        await queryRunner.query(`ALTER TABLE "resource" DROP COLUMN "storyblokId"`);
        await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "storyblokId"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course" ADD "storyblokId" integer`);
        await queryRunner.query(`ALTER TABLE "resource" ADD "storyblokId" integer`);
        await queryRunner.query(`ALTER TABLE "session" ADD "storyblokId" integer`);
    }

}