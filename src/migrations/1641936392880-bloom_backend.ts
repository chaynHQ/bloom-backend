import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1641936392880 implements MigrationInterface {
    name = 'bloomBackend1641936392880'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "course" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "courseId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "status" character varying, "storyblokid" character varying, CONSTRAINT "UQ_baccb82c6179dca139f6b8c7680" UNIQUE ("status"), CONSTRAINT "UQ_42e7f401dbf533e92815fb87cbf" UNIQUE ("storyblokid"), CONSTRAINT "PK_eda8475dda5090c7f747251dd2e" PRIMARY KEY ("courseId"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "course"`);
    }

}
