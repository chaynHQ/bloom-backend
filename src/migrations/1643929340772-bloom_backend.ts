import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1643929340772 implements MigrationInterface {
    name = 'bloomBackend1643929340772'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "session_user" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sessionUserId" uuid NOT NULL DEFAULT uuid_generate_v4(), "completed" boolean NOT NULL, "sessionId" uuid NOT NULL, "courseUserId" uuid NOT NULL, CONSTRAINT "session_user_index_name" UNIQUE ("courseUserId", "sessionId"), CONSTRAINT "PK_79d7649f75158323813916f4540" PRIMARY KEY ("sessionUserId"))`);
        await queryRunner.query(`CREATE TABLE "session" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sessionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "status" character varying, "storyblokId" character varying, "courseId" uuid NOT NULL, CONSTRAINT "UQ_ba3527651cbf779979fa629291c" UNIQUE ("storyblokId"), CONSTRAINT "PK_6f8fc3d2111ccc30d98e173d8dd" PRIMARY KEY ("sessionId"))`);
        await queryRunner.query(`CREATE TABLE "course" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "courseId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "status" character varying, "storyblokId" character varying, CONSTRAINT "UQ_5a0a12dbf4f0976cdcb1702509e" UNIQUE ("storyblokId"), CONSTRAINT "PK_eda8475dda5090c7f747251dd2e" PRIMARY KEY ("courseId"))`);
        await queryRunner.query(`CREATE TABLE "partner_access" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "partnerAccessId" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid, "partnerId" uuid NOT NULL, "partnerAdminId" uuid NOT NULL, "activatedAt" TIMESTAMP, "featureLiveChat" boolean NOT NULL, "featureTherapy" boolean NOT NULL, "accessCode" character varying(6) NOT NULL, "therapySessionsRemaining" integer NOT NULL, "therapySessionsRedeemed" integer NOT NULL, CONSTRAINT "UQ_00611e9118387038c2c74f5e718" UNIQUE ("accessCode"), CONSTRAINT "PK_843575c1a183cd4712ec086aa1d" PRIMARY KEY ("partnerAccessId"))`);
        await queryRunner.query(`CREATE TABLE "partner" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "partnerId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "logo" character varying, "primaryColour" character varying, CONSTRAINT "UQ_9af6a8bd7cac55b61babc753853" UNIQUE ("name"), CONSTRAINT "PK_7640657fe5aec85a4120cbfdd09" PRIMARY KEY ("partnerId"))`);
        await queryRunner.query(`CREATE TABLE "partner_admin" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "partnerAdminId" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid, "partnerId" uuid NOT NULL, CONSTRAINT "REL_825f3ea183aebdb95a52f1f972" UNIQUE ("userId"), CONSTRAINT "PK_0e8e3a3ec7e3f80389ba84a2207" PRIMARY KEY ("partnerAdminId"))`);
        await queryRunner.query(`CREATE TABLE "user" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid NOT NULL DEFAULT uuid_generate_v4(), "firebaseUid" character varying NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "languageDefault" character varying NOT NULL, "contactPermission" boolean NOT NULL, "isSuperAdmin" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_905432b2c46bdcfe1a0dd3cdeff" UNIQUE ("firebaseUid"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_d72ea127f30e21753c9e229891e" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`CREATE TABLE "course_user" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "courseUserId" uuid NOT NULL DEFAULT uuid_generate_v4(), "completed" boolean NOT NULL, "userId" uuid NOT NULL, "courseId" uuid NOT NULL, CONSTRAINT "course_user_index_name" UNIQUE ("userId", "courseId"), CONSTRAINT "PK_7c234711d5baef4d816619dbfa0" PRIMARY KEY ("courseUserId"))`);
        await queryRunner.query(`ALTER TABLE "session_user" ADD CONSTRAINT "FK_5452e53b773936e51ff0e96d064" FOREIGN KEY ("sessionId") REFERENCES "session"("sessionId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "session_user" ADD CONSTRAINT "FK_3014902f31f2a83ec475d75bec8" FOREIGN KEY ("courseUserId") REFERENCES "course_user"("courseUserId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "session" ADD CONSTRAINT "FK_2440b236e81d633ff0613ae59d4" FOREIGN KEY ("courseId") REFERENCES "course"("courseId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_access" ADD CONSTRAINT "FK_25e7860a2eec1f9366fcfe3a954" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_access" ADD CONSTRAINT "FK_60f11a3686ca313f1ac25f689f9" FOREIGN KEY ("partnerId") REFERENCES "partner"("partnerId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_access" ADD CONSTRAINT "FK_e25f0b4b2c6fbddc8375b02f73e" FOREIGN KEY ("partnerAdminId") REFERENCES "partner_admin"("partnerAdminId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_admin" ADD CONSTRAINT "FK_825f3ea183aebdb95a52f1f972c" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_admin" ADD CONSTRAINT "FK_c7ee0521b73218dd1f0b13e23d5" FOREIGN KEY ("partnerId") REFERENCES "partner"("partnerId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "course_user" ADD CONSTRAINT "FK_062e03d78da22a7bd9becbfaaac" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "course_user" ADD CONSTRAINT "FK_70824fef35e6038e459e58e0358" FOREIGN KEY ("courseId") REFERENCES "course"("courseId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course_user" DROP CONSTRAINT "FK_70824fef35e6038e459e58e0358"`);
        await queryRunner.query(`ALTER TABLE "course_user" DROP CONSTRAINT "FK_062e03d78da22a7bd9becbfaaac"`);
        await queryRunner.query(`ALTER TABLE "partner_admin" DROP CONSTRAINT "FK_c7ee0521b73218dd1f0b13e23d5"`);
        await queryRunner.query(`ALTER TABLE "partner_admin" DROP CONSTRAINT "FK_825f3ea183aebdb95a52f1f972c"`);
        await queryRunner.query(`ALTER TABLE "partner_access" DROP CONSTRAINT "FK_e25f0b4b2c6fbddc8375b02f73e"`);
        await queryRunner.query(`ALTER TABLE "partner_access" DROP CONSTRAINT "FK_60f11a3686ca313f1ac25f689f9"`);
        await queryRunner.query(`ALTER TABLE "partner_access" DROP CONSTRAINT "FK_25e7860a2eec1f9366fcfe3a954"`);
        await queryRunner.query(`ALTER TABLE "session" DROP CONSTRAINT "FK_2440b236e81d633ff0613ae59d4"`);
        await queryRunner.query(`ALTER TABLE "session_user" DROP CONSTRAINT "FK_3014902f31f2a83ec475d75bec8"`);
        await queryRunner.query(`ALTER TABLE "session_user" DROP CONSTRAINT "FK_5452e53b773936e51ff0e96d064"`);
        await queryRunner.query(`DROP TABLE "course_user"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "partner_admin"`);
        await queryRunner.query(`DROP TABLE "partner"`);
        await queryRunner.query(`DROP TABLE "partner_access"`);
        await queryRunner.query(`DROP TABLE "course"`);
        await queryRunner.query(`DROP TABLE "session"`);
        await queryRunner.query(`DROP TABLE "session_user"`);
    }

}
