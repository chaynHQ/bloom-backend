import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1641582533212 implements MigrationInterface {
    name = 'bloomBackend1641582533212'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "course_user" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "courseUserId" uuid NOT NULL DEFAULT uuid_generate_v4(), "completed" boolean NOT NULL, "userId" uuid NOT NULL, "courseId" uuid NOT NULL, CONSTRAINT "PK_7c234711d5baef4d816619dbfa0" PRIMARY KEY ("courseUserId"))`);
        await queryRunner.query(`ALTER TABLE "course_user" ADD CONSTRAINT "FK_062e03d78da22a7bd9becbfaaac" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "course_user" ADD CONSTRAINT "FK_70824fef35e6038e459e58e0358" FOREIGN KEY ("courseId") REFERENCES "course"("courseId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course_user" DROP CONSTRAINT "FK_70824fef35e6038e459e58e0358"`);
        await queryRunner.query(`ALTER TABLE "course_user" DROP CONSTRAINT "FK_062e03d78da22a7bd9becbfaaac"`);
        await queryRunner.query(`DROP TABLE "course_user"`);
    }

}
