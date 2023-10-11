import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1696994943309 implements MigrationInterface {
    name = 'bloomBackend1696994943309'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "session" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sessionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "status" character varying, "storyblokId" integer, "storyblokUuid" character varying, "courseId" uuid NOT NULL, CONSTRAINT "UQ_ba3527651cbf779979fa629291c" UNIQUE ("storyblokId"), CONSTRAINT "UQ_1f783305eb447dc4ffac2198d79" UNIQUE ("storyblokUuid"), CONSTRAINT "PK_6f8fc3d2111ccc30d98e173d8dd" PRIMARY KEY ("sessionId"))`);
        await queryRunner.query(`CREATE TABLE "session_user" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sessionUserId" uuid NOT NULL DEFAULT uuid_generate_v4(), "completed" boolean NOT NULL, "completedAt" date, "sessionId" uuid NOT NULL, "courseUserId" uuid NOT NULL, CONSTRAINT "session_user_index_name" UNIQUE ("courseUserId", "sessionId"), CONSTRAINT "PK_79d7649f75158323813916f4540" PRIMARY KEY ("sessionUserId"))`);
        await queryRunner.query(`CREATE TABLE "feature" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "featureId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, CONSTRAINT "UQ_4832be692a2dc63d67e8e93c758" UNIQUE ("name"), CONSTRAINT "PK_a9741bb40b605518c6f1541a557" PRIMARY KEY ("featureId"))`);
        await queryRunner.query(`CREATE TABLE "partner_feature" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "partnerFeatureId" uuid NOT NULL DEFAULT uuid_generate_v4(), "active" boolean NOT NULL, "partnerId" uuid NOT NULL, "featureId" uuid NOT NULL, CONSTRAINT "partner_feature_index_name" UNIQUE ("partnerId", "featureId"), CONSTRAINT "PK_cfee5b8bb3477126121888ff1e6" PRIMARY KEY ("partnerFeatureId"))`);
        await queryRunner.query(`CREATE TABLE "partner" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "partnerId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_9af6a8bd7cac55b61babc753853" UNIQUE ("name"), CONSTRAINT "PK_7640657fe5aec85a4120cbfdd09" PRIMARY KEY ("partnerId"))`);
        await queryRunner.query(`CREATE TABLE "partner_admin" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "partnerAdminId" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid, "partnerId" uuid NOT NULL, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "REL_825f3ea183aebdb95a52f1f972" UNIQUE ("userId"), CONSTRAINT "PK_0e8e3a3ec7e3f80389ba84a2207" PRIMARY KEY ("partnerAdminId"))`);
        await queryRunner.query(`CREATE TABLE "therapy_session" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "action" character varying NOT NULL, "clientEmail" character varying NOT NULL, "bookingCode" character varying, "clientTimezone" character varying, "serviceName" character varying NOT NULL, "serviceProviderName" character varying NOT NULL, "serviceProviderEmail" character varying NOT NULL, "startDateTime" TIMESTAMP WITH TIME ZONE NOT NULL, "endDateTime" TIMESTAMP WITH TIME ZONE NOT NULL, "cancelledAt" TIMESTAMP WITH TIME ZONE, "rescheduledFrom" TIMESTAMP WITH TIME ZONE, "completedAt" TIMESTAMP WITH TIME ZONE, "partnerAccessId" uuid NOT NULL, "userId" uuid, CONSTRAINT "PK_e93fdabd0275685d8e6f7d288dc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "partner_access" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "partnerAccessId" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid, "partnerId" uuid NOT NULL, "partnerAdminId" uuid, "active" boolean NOT NULL DEFAULT true, "activatedAt" TIMESTAMP, "featureLiveChat" boolean NOT NULL, "featureTherapy" boolean NOT NULL, "accessCode" character varying(6) NOT NULL, "therapySessionsRemaining" integer NOT NULL, "therapySessionsRedeemed" integer NOT NULL, CONSTRAINT "UQ_00611e9118387038c2c74f5e718" UNIQUE ("accessCode"), CONSTRAINT "PK_843575c1a183cd4712ec086aa1d" PRIMARY KEY ("partnerAccessId"))`);
        await queryRunner.query(`CREATE TABLE "subscription" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "subscriptionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, CONSTRAINT "UQ_9e5c9733b3b3d58f3d3e7ef8078" UNIQUE ("name"), CONSTRAINT "PK_13cecd7da6abc7ae934d8560bef" PRIMARY KEY ("subscriptionId"))`);
        await queryRunner.query(`CREATE TABLE "subscription_user" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "subscriptionUserId" uuid NOT NULL DEFAULT uuid_generate_v4(), "subscriptionInfo" character varying NOT NULL, "subscriptionId" uuid NOT NULL, "userId" uuid NOT NULL, "cancelledAt" date, CONSTRAINT "PK_49bc0c05ff92e69e1da10d247b7" PRIMARY KEY ("subscriptionUserId"))`);
        await queryRunner.query(`CREATE TABLE "user" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid NOT NULL DEFAULT uuid_generate_v4(), "firebaseUid" character varying NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "signUpLanguage" character varying, "contactPermission" boolean NOT NULL, "isSuperAdmin" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "crispTokenId" uuid NOT NULL DEFAULT uuid_generate_v4(), CONSTRAINT "UQ_905432b2c46bdcfe1a0dd3cdeff" UNIQUE ("firebaseUid"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "UQ_64c33fea871de4f4b78e5976c22" UNIQUE ("crispTokenId"), CONSTRAINT "PK_d72ea127f30e21753c9e229891e" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`CREATE TABLE "course_user" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "courseUserId" uuid NOT NULL DEFAULT uuid_generate_v4(), "completed" boolean NOT NULL, "completedAt" date, "userId" uuid NOT NULL, "courseId" uuid NOT NULL, CONSTRAINT "course_user_index_name" UNIQUE ("userId", "courseId"), CONSTRAINT "PK_7c234711d5baef4d816619dbfa0" PRIMARY KEY ("courseUserId"))`);
        await queryRunner.query(`CREATE TABLE "course" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "courseId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "status" character varying, "storyblokId" integer, "storyblokUuid" character varying, CONSTRAINT "UQ_5a0a12dbf4f0976cdcb1702509e" UNIQUE ("storyblokId"), CONSTRAINT "UQ_a7639e517bf5d97ee6c3bdaa6ca" UNIQUE ("storyblokUuid"), CONSTRAINT "PK_eda8475dda5090c7f747251dd2e" PRIMARY KEY ("courseId"))`);
        await queryRunner.query(`CREATE TABLE "course_partner" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "coursePartnerId" uuid NOT NULL DEFAULT uuid_generate_v4(), "partnerId" uuid, "courseId" uuid NOT NULL, "active" boolean NOT NULL, CONSTRAINT "course_partner_index_name" UNIQUE ("partnerId", "courseId"), CONSTRAINT "PK_739b446c5c24fb11773a8e62331" PRIMARY KEY ("coursePartnerId"))`);
        await queryRunner.query(`CREATE TABLE "email_campaign" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "campaignType" character varying NOT NULL, "email" character varying NOT NULL, "emailSentDateTime" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_140462ad4b82245fec89e5a3976" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "session" ADD CONSTRAINT "FK_2440b236e81d633ff0613ae59d4" FOREIGN KEY ("courseId") REFERENCES "course"("courseId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "session_user" ADD CONSTRAINT "FK_5452e53b773936e51ff0e96d064" FOREIGN KEY ("sessionId") REFERENCES "session"("sessionId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "session_user" ADD CONSTRAINT "FK_3014902f31f2a83ec475d75bec8" FOREIGN KEY ("courseUserId") REFERENCES "course_user"("courseUserId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_feature" ADD CONSTRAINT "FK_91fa49f0f077d1d47ef581d458c" FOREIGN KEY ("partnerId") REFERENCES "partner"("partnerId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_feature" ADD CONSTRAINT "FK_c824581c685cf5969f43732ec75" FOREIGN KEY ("featureId") REFERENCES "feature"("featureId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_admin" ADD CONSTRAINT "FK_825f3ea183aebdb95a52f1f972c" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_admin" ADD CONSTRAINT "FK_c7ee0521b73218dd1f0b13e23d5" FOREIGN KEY ("partnerId") REFERENCES "partner"("partnerId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "therapy_session" ADD CONSTRAINT "FK_95b7041e4d05e914cde6b3753d0" FOREIGN KEY ("partnerAccessId") REFERENCES "partner_access"("partnerAccessId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "therapy_session" ADD CONSTRAINT "FK_58700a8a5d47651d0e895a86b4e" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_access" ADD CONSTRAINT "FK_25e7860a2eec1f9366fcfe3a954" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_access" ADD CONSTRAINT "FK_60f11a3686ca313f1ac25f689f9" FOREIGN KEY ("partnerId") REFERENCES "partner"("partnerId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_access" ADD CONSTRAINT "FK_e25f0b4b2c6fbddc8375b02f73e" FOREIGN KEY ("partnerAdminId") REFERENCES "partner_admin"("partnerAdminId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "subscription_user" ADD CONSTRAINT "FK_cdf67f6c499d7a4c7b4d1524850" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("subscriptionId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "subscription_user" ADD CONSTRAINT "FK_0feee04ab572b223d511672be81" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "course_user" ADD CONSTRAINT "FK_062e03d78da22a7bd9becbfaaac" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "course_user" ADD CONSTRAINT "FK_70824fef35e6038e459e58e0358" FOREIGN KEY ("courseId") REFERENCES "course"("courseId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "course_partner" ADD CONSTRAINT "FK_96575d601e92c89fa881d2eb128" FOREIGN KEY ("partnerId") REFERENCES "partner"("partnerId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "course_partner" ADD CONSTRAINT "FK_4799c98d625acaae457c7dd23da" FOREIGN KEY ("courseId") REFERENCES "course"("courseId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "course_partner" DROP CONSTRAINT "FK_4799c98d625acaae457c7dd23da"`);
        await queryRunner.query(`ALTER TABLE "course_partner" DROP CONSTRAINT "FK_96575d601e92c89fa881d2eb128"`);
        await queryRunner.query(`ALTER TABLE "course_user" DROP CONSTRAINT "FK_70824fef35e6038e459e58e0358"`);
        await queryRunner.query(`ALTER TABLE "course_user" DROP CONSTRAINT "FK_062e03d78da22a7bd9becbfaaac"`);
        await queryRunner.query(`ALTER TABLE "subscription_user" DROP CONSTRAINT "FK_0feee04ab572b223d511672be81"`);
        await queryRunner.query(`ALTER TABLE "subscription_user" DROP CONSTRAINT "FK_cdf67f6c499d7a4c7b4d1524850"`);
        await queryRunner.query(`ALTER TABLE "partner_access" DROP CONSTRAINT "FK_e25f0b4b2c6fbddc8375b02f73e"`);
        await queryRunner.query(`ALTER TABLE "partner_access" DROP CONSTRAINT "FK_60f11a3686ca313f1ac25f689f9"`);
        await queryRunner.query(`ALTER TABLE "partner_access" DROP CONSTRAINT "FK_25e7860a2eec1f9366fcfe3a954"`);
        await queryRunner.query(`ALTER TABLE "therapy_session" DROP CONSTRAINT "FK_58700a8a5d47651d0e895a86b4e"`);
        await queryRunner.query(`ALTER TABLE "therapy_session" DROP CONSTRAINT "FK_95b7041e4d05e914cde6b3753d0"`);
        await queryRunner.query(`ALTER TABLE "partner_admin" DROP CONSTRAINT "FK_c7ee0521b73218dd1f0b13e23d5"`);
        await queryRunner.query(`ALTER TABLE "partner_admin" DROP CONSTRAINT "FK_825f3ea183aebdb95a52f1f972c"`);
        await queryRunner.query(`ALTER TABLE "partner_feature" DROP CONSTRAINT "FK_c824581c685cf5969f43732ec75"`);
        await queryRunner.query(`ALTER TABLE "partner_feature" DROP CONSTRAINT "FK_91fa49f0f077d1d47ef581d458c"`);
        await queryRunner.query(`ALTER TABLE "session_user" DROP CONSTRAINT "FK_3014902f31f2a83ec475d75bec8"`);
        await queryRunner.query(`ALTER TABLE "session_user" DROP CONSTRAINT "FK_5452e53b773936e51ff0e96d064"`);
        await queryRunner.query(`ALTER TABLE "session" DROP CONSTRAINT "FK_2440b236e81d633ff0613ae59d4"`);
        await queryRunner.query(`DROP TABLE "email_campaign"`);
        await queryRunner.query(`DROP TABLE "course_partner"`);
        await queryRunner.query(`DROP TABLE "course"`);
        await queryRunner.query(`DROP TABLE "course_user"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "subscription_user"`);
        await queryRunner.query(`DROP TABLE "subscription"`);
        await queryRunner.query(`DROP TABLE "partner_access"`);
        await queryRunner.query(`DROP TABLE "therapy_session"`);
        await queryRunner.query(`DROP TABLE "partner_admin"`);
        await queryRunner.query(`DROP TABLE "partner"`);
        await queryRunner.query(`DROP TABLE "partner_feature"`);
        await queryRunner.query(`DROP TABLE "feature"`);
        await queryRunner.query(`DROP TABLE "session_user"`);
        await queryRunner.query(`DROP TABLE "session"`);
    }

}
