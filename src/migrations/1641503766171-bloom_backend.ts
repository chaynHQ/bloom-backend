import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1641503766171 implements MigrationInterface {
    name = 'bloomBackend1641503766171'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "course" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "courseId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "active" boolean NOT NULL, "storyBlokId" character varying NOT NULL, CONSTRAINT "PK_eda8475dda5090c7f747251dd2e" PRIMARY KEY ("courseId"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "course"`);
    }

}
