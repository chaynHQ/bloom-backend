import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1643540281771 implements MigrationInterface {
    name = 'bloomBackend1643540281771'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "course_partner" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "coursePartnerId" uuid NOT NULL DEFAULT uuid_generate_v4(), "partnerId" uuid NOT NULL, "courseId" uuid NOT NULL, CONSTRAINT "PK_739b446c5c24fb11773a8e62331" PRIMARY KEY ("coursePartnerId"))`);
        await queryRunner.query(`ALTER TABLE "course_partner" ADD CONSTRAINT "FK_96575d601e92c89fa881d2eb128" FOREIGN KEY ("partnerId") REFERENCES "partner"("partnerId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "course_partner" ADD CONSTRAINT "FK_4799c98d625acaae457c7dd23da" FOREIGN KEY ("courseId") REFERENCES "course"("courseId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course_partner" DROP CONSTRAINT "FK_4799c98d625acaae457c7dd23da"`);
        await queryRunner.query(`ALTER TABLE "course_partner" DROP CONSTRAINT "FK_96575d601e92c89fa881d2eb128"`);
        await queryRunner.query(`DROP TABLE "course_partner"`);
    }

}
