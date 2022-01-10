import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1641830539648 implements MigrationInterface {
    name = 'bloomBackend1641830539648'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course" DROP COLUMN "storyBlokId"`);
        await queryRunner.query(`ALTER TABLE "course" ADD "storyblokid" character varying`);
        await queryRunner.query(`ALTER TABLE "course" ADD CONSTRAINT "UQ_42e7f401dbf533e92815fb87cbf" UNIQUE ("storyblokid")`);
        await queryRunner.query(`ALTER TABLE "course" DROP COLUMN "active"`);
        await queryRunner.query(`ALTER TABLE "course" ADD "active" character varying`);
        await queryRunner.query(`ALTER TABLE "course" ADD CONSTRAINT "UQ_169ed1ea571601b11c1b40f20a4" UNIQUE ("active")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course" DROP CONSTRAINT "UQ_169ed1ea571601b11c1b40f20a4"`);
        await queryRunner.query(`ALTER TABLE "course" DROP COLUMN "active"`);
        await queryRunner.query(`ALTER TABLE "course" ADD "active" boolean NOT NULL`);
        await queryRunner.query(`ALTER TABLE "course" DROP CONSTRAINT "UQ_42e7f401dbf533e92815fb87cbf"`);
        await queryRunner.query(`ALTER TABLE "course" DROP COLUMN "storyblokid"`);
        await queryRunner.query(`ALTER TABLE "course" ADD "storyBlokId" character varying NOT NULL`);
    }

}
