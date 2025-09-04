import { MigrationInterface, QueryRunner } from "typeorm";

export class BloomBackend1756987770157 implements MigrationInterface {
    name = 'BloomBackend1756987770157'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session" DROP CONSTRAINT "UQ_ba3527651cbf779979fa629291c"`);
        await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "storyblokId"`);
        await queryRunner.query(`ALTER TABLE "resource" DROP CONSTRAINT "UQ_1b4b84228b725114ccc955dcec7"`);
        await queryRunner.query(`ALTER TABLE "resource" DROP COLUMN "storyblokId"`);
        await queryRunner.query(`ALTER TABLE "course" DROP CONSTRAINT "UQ_5a0a12dbf4f0976cdcb1702509e"`);
        await queryRunner.query(`ALTER TABLE "course" DROP COLUMN "storyblokId"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course" ADD "storyblokId" integer`);
        await queryRunner.query(`ALTER TABLE "course" ADD CONSTRAINT "UQ_5a0a12dbf4f0976cdcb1702509e" UNIQUE ("storyblokId")`);
        await queryRunner.query(`ALTER TABLE "resource" ADD "storyblokId" integer`);
        await queryRunner.query(`ALTER TABLE "resource" ADD CONSTRAINT "UQ_1b4b84228b725114ccc955dcec7" UNIQUE ("storyblokId")`);
        await queryRunner.query(`ALTER TABLE "session" ADD "storyblokId" integer`);
        await queryRunner.query(`ALTER TABLE "session" ADD CONSTRAINT "UQ_ba3527651cbf779979fa629291c" UNIQUE ("storyblokId")`);
    }

}
