import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1636591445864 implements MigrationInterface {
    name = 'bloomBackend1636591445864'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "partner" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "partnerId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "logo" character varying, "primaryColour" character varying, CONSTRAINT "PK_7640657fe5aec85a4120cbfdd09" PRIMARY KEY ("partnerId"))`);
        await queryRunner.query(`CREATE TABLE "user" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid NOT NULL DEFAULT uuid_generate_v4(), "firebaseUid" character varying NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "languageDefault" character varying NOT NULL, CONSTRAINT "UQ_905432b2c46bdcfe1a0dd3cdeff" UNIQUE ("firebaseUid"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_d72ea127f30e21753c9e229891e" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`CREATE TABLE "partner_admin" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "partnerAdminId" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid, "partnerId" uuid NOT NULL, CONSTRAINT "REL_825f3ea183aebdb95a52f1f972" UNIQUE ("userId"), CONSTRAINT "PK_0e8e3a3ec7e3f80389ba84a2207" PRIMARY KEY ("partnerAdminId"))`);
        await queryRunner.query(`CREATE TABLE "partner_access" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "partnerAccessId" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid, "partnerId" uuid NOT NULL, "partnerAdminId" uuid NOT NULL, "activatedAt" TIMESTAMP, "featureLiveChat" boolean NOT NULL, "featureTherapy" boolean NOT NULL, "accessCode" character varying(6) NOT NULL, "therapySessionsRemaining" integer NOT NULL, "therapySessionsRedeemed" integer NOT NULL, CONSTRAINT "UQ_00611e9118387038c2c74f5e718" UNIQUE ("accessCode"), CONSTRAINT "REL_25e7860a2eec1f9366fcfe3a95" UNIQUE ("userId"), CONSTRAINT "PK_843575c1a183cd4712ec086aa1d" PRIMARY KEY ("partnerAccessId"))`);
        await queryRunner.query(`ALTER TABLE "partner_admin" ADD CONSTRAINT "FK_825f3ea183aebdb95a52f1f972c" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_admin" ADD CONSTRAINT "FK_c7ee0521b73218dd1f0b13e23d5" FOREIGN KEY ("partnerId") REFERENCES "partner"("partnerId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_access" ADD CONSTRAINT "FK_25e7860a2eec1f9366fcfe3a954" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_access" ADD CONSTRAINT "FK_60f11a3686ca313f1ac25f689f9" FOREIGN KEY ("partnerId") REFERENCES "partner"("partnerId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_access" ADD CONSTRAINT "FK_e25f0b4b2c6fbddc8375b02f73e" FOREIGN KEY ("partnerAdminId") REFERENCES "partner_admin"("partnerAdminId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partner_access" DROP CONSTRAINT "FK_e25f0b4b2c6fbddc8375b02f73e"`);
        await queryRunner.query(`ALTER TABLE "partner_access" DROP CONSTRAINT "FK_60f11a3686ca313f1ac25f689f9"`);
        await queryRunner.query(`ALTER TABLE "partner_access" DROP CONSTRAINT "FK_25e7860a2eec1f9366fcfe3a954"`);
        await queryRunner.query(`ALTER TABLE "partner_admin" DROP CONSTRAINT "FK_c7ee0521b73218dd1f0b13e23d5"`);
        await queryRunner.query(`ALTER TABLE "partner_admin" DROP CONSTRAINT "FK_825f3ea183aebdb95a52f1f972c"`);
        await queryRunner.query(`DROP TABLE "partner_access"`);
        await queryRunner.query(`DROP TABLE "partner_admin"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "partner"`);
    }

}
