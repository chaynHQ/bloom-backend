import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1641936644784 implements MigrationInterface {
    name = 'bloomBackend1641936644784'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "session" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sessionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "status" character varying, "storyblokid" character varying, "courseId" uuid NOT NULL, CONSTRAINT "UQ_6becf4504fe1ca053090582684a" UNIQUE ("status"), CONSTRAINT "UQ_dd7dba87c3823edeec1f8f390fd" UNIQUE ("storyblokid"), CONSTRAINT "PK_6f8fc3d2111ccc30d98e173d8dd" PRIMARY KEY ("sessionId"))`);
        await queryRunner.query(`ALTER TABLE "session" ADD CONSTRAINT "FK_2440b236e81d633ff0613ae59d4" FOREIGN KEY ("courseId") REFERENCES "course"("courseId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session" DROP CONSTRAINT "FK_2440b236e81d633ff0613ae59d4"`);
        await queryRunner.query(`DROP TABLE "session"`);
    }

}
