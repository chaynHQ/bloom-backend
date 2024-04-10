import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1644933107950 implements MigrationInterface {
  name = 'bloomBackend1644933107950';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "session" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sessionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "status" character varying, "storyblokId" integer, "storyblokUuid" character varying, "courseId" uuid NOT NULL, CONSTRAINT "UQ_ba3527651cbf779979fa629291c" UNIQUE ("storyblokId"), CONSTRAINT "UQ_1f783305eb447dc4ffac2198d79" UNIQUE ("storyblokUuid"), CONSTRAINT "PK_6f8fc3d2111ccc30d98e173d8dd" PRIMARY KEY ("sessionId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "session_user" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sessionUserId" uuid NOT NULL DEFAULT uuid_generate_v4(), "completed" boolean NOT NULL, "completedAt" date, "sessionId" uuid NOT NULL, "courseUserId" uuid NOT NULL, CONSTRAINT "session_user_index_name" UNIQUE ("courseUserId", "sessionId"), CONSTRAINT "PK_79d7649f75158323813916f4540" PRIMARY KEY ("sessionUserId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "course_user" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "courseUserId" uuid NOT NULL DEFAULT uuid_generate_v4(), "completed" boolean NOT NULL, "completedAt" date, "userId" uuid NOT NULL, "courseId" uuid NOT NULL, CONSTRAINT "course_user_index_name" UNIQUE ("userId", "courseId"), CONSTRAINT "PK_7c234711d5baef4d816619dbfa0" PRIMARY KEY ("courseUserId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "course" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "courseId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "status" character varying, "storyblokId" integer, "storyblokUuid" character varying, CONSTRAINT "UQ_5a0a12dbf4f0976cdcb1702509e" UNIQUE ("storyblokId"), CONSTRAINT "UQ_a7639e517bf5d97ee6c3bdaa6ca" UNIQUE ("storyblokUuid"), CONSTRAINT "PK_eda8475dda5090c7f747251dd2e" PRIMARY KEY ("courseId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "course_partner" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "coursePartnerId" uuid NOT NULL DEFAULT uuid_generate_v4(), "partnerId" uuid, "courseId" uuid NOT NULL, "active" boolean NOT NULL, CONSTRAINT "course_partner_index_name" UNIQUE ("partnerId", "courseId"), CONSTRAINT "PK_739b446c5c24fb11773a8e62331" PRIMARY KEY ("coursePartnerId"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" ADD CONSTRAINT "FK_2440b236e81d633ff0613ae59d4" FOREIGN KEY ("courseId") REFERENCES "course"("courseId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_user" ADD CONSTRAINT "FK_5452e53b773936e51ff0e96d064" FOREIGN KEY ("sessionId") REFERENCES "session"("sessionId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_user" ADD CONSTRAINT "FK_3014902f31f2a83ec475d75bec8" FOREIGN KEY ("courseUserId") REFERENCES "course_user"("courseUserId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_user" ADD CONSTRAINT "FK_062e03d78da22a7bd9becbfaaac" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_user" ADD CONSTRAINT "FK_70824fef35e6038e459e58e0358" FOREIGN KEY ("courseId") REFERENCES "course"("courseId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_partner" ADD CONSTRAINT "FK_96575d601e92c89fa881d2eb128" FOREIGN KEY ("partnerId") REFERENCES "partner"("partnerId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_partner" ADD CONSTRAINT "FK_4799c98d625acaae457c7dd23da" FOREIGN KEY ("courseId") REFERENCES "course"("courseId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course_partner" DROP CONSTRAINT "FK_4799c98d625acaae457c7dd23da"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_partner" DROP CONSTRAINT "FK_96575d601e92c89fa881d2eb128"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_user" DROP CONSTRAINT "FK_70824fef35e6038e459e58e0358"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_user" DROP CONSTRAINT "FK_062e03d78da22a7bd9becbfaaac"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_user" DROP CONSTRAINT "FK_3014902f31f2a83ec475d75bec8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_user" DROP CONSTRAINT "FK_5452e53b773936e51ff0e96d064"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" DROP CONSTRAINT "FK_2440b236e81d633ff0613ae59d4"`,
    );
    await queryRunner.query(`DROP TABLE "course_partner"`);
    await queryRunner.query(`DROP TABLE "course"`);
    await queryRunner.query(`DROP TABLE "course_user"`);
    await queryRunner.query(`DROP TABLE "session_user"`);
    await queryRunner.query(`DROP TABLE "session"`);
  }
}
