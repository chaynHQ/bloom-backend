import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1644685017333 implements MigrationInterface {
    name = 'bloomBackend1644685017333'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session" ADD "storyblokUuid" character varying`);
        await queryRunner.query(`ALTER TABLE "session" ADD CONSTRAINT "UQ_1f783305eb447dc4ffac2198d79" UNIQUE ("storyblokUuid")`);
        await queryRunner.query(`ALTER TABLE "course" ADD "storyblokUuid" character varying`);
        await queryRunner.query(`ALTER TABLE "course" ADD CONSTRAINT "UQ_a7639e517bf5d97ee6c3bdaa6ca" UNIQUE ("storyblokUuid")`);
        await queryRunner.query(`ALTER TABLE "session" DROP CONSTRAINT "UQ_ba3527651cbf779979fa629291c"`);
        await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "storyblokId"`);
        await queryRunner.query(`ALTER TABLE "session" ADD "storyblokId" integer`);
        await queryRunner.query(`ALTER TABLE "session" ADD CONSTRAINT "UQ_ba3527651cbf779979fa629291c" UNIQUE ("storyblokId")`);
        await queryRunner.query(`ALTER TABLE "course" DROP CONSTRAINT "UQ_5a0a12dbf4f0976cdcb1702509e"`);
        await queryRunner.query(`ALTER TABLE "course" DROP COLUMN "storyblokId"`);
        await queryRunner.query(`ALTER TABLE "course" ADD "storyblokId" integer`);
        await queryRunner.query(`ALTER TABLE "course" ADD CONSTRAINT "UQ_5a0a12dbf4f0976cdcb1702509e" UNIQUE ("storyblokId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course" DROP CONSTRAINT "UQ_5a0a12dbf4f0976cdcb1702509e"`);
        await queryRunner.query(`ALTER TABLE "course" DROP COLUMN "storyblokId"`);
        await queryRunner.query(`ALTER TABLE "course" ADD "storyblokId" character varying`);
        await queryRunner.query(`ALTER TABLE "course" ADD CONSTRAINT "UQ_5a0a12dbf4f0976cdcb1702509e" UNIQUE ("storyblokId")`);
        await queryRunner.query(`ALTER TABLE "session" DROP CONSTRAINT "UQ_ba3527651cbf779979fa629291c"`);
        await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "storyblokId"`);
        await queryRunner.query(`ALTER TABLE "session" ADD "storyblokId" character varying`);
        await queryRunner.query(`ALTER TABLE "session" ADD CONSTRAINT "UQ_ba3527651cbf779979fa629291c" UNIQUE ("storyblokId")`);
        await queryRunner.query(`ALTER TABLE "course" DROP CONSTRAINT "UQ_a7639e517bf5d97ee6c3bdaa6ca"`);
        await queryRunner.query(`ALTER TABLE "course" DROP COLUMN "storyblokUuid"`);
        await queryRunner.query(`ALTER TABLE "session" DROP CONSTRAINT "UQ_1f783305eb447dc4ffac2198d79"`);
        await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "storyblokUuid"`);
    }

}
