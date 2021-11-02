import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1635866098202 implements MigrationInterface {
    name = 'bloomBackend1635866098202'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "base_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_03e6c58047b7a4b3f6de0bfa8d7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "partner_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying NOT NULL, "logo" character varying, "primaryColour" character varying, CONSTRAINT "PK_3c0bb3b2afcb1923ed5425e5e43" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "firebaseUid" character varying NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "languageDefault" character varying NOT NULL, CONSTRAINT "UQ_49078f34521b6bb5328396e971e" UNIQUE ("firebaseUid"), CONSTRAINT "UQ_415c35b9b3b6fe45a3b065030f5" UNIQUE ("email"), CONSTRAINT "PK_b54f8ea623b17094db7667d8206" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "partner_admin_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "partnerId" uuid, CONSTRAINT "PK_053db2d5da6c9a732993bbf6ef5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "partner_access_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "activatedAt" TIMESTAMP, "featureLiveChat" boolean NOT NULL, "featureTherapy" boolean NOT NULL, "therapySessionsRemaining" integer NOT NULL, "therapySessionsRedeemed" integer NOT NULL, "partnerId" uuid, "createdById" uuid, CONSTRAINT "PK_9536c21fc956ec857c4d5ef51cc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "partner_admin_entity" ADD CONSTRAINT "FK_b2a8240d70de9ba235015286f77" FOREIGN KEY ("partnerId") REFERENCES "partner_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_access_entity" ADD CONSTRAINT "FK_700650980fa20fa2b2d29199598" FOREIGN KEY ("partnerId") REFERENCES "partner_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_access_entity" ADD CONSTRAINT "FK_994dec156e9a32578bc531761e2" FOREIGN KEY ("createdById") REFERENCES "partner_admin_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partner_access_entity" DROP CONSTRAINT "FK_994dec156e9a32578bc531761e2"`);
        await queryRunner.query(`ALTER TABLE "partner_access_entity" DROP CONSTRAINT "FK_700650980fa20fa2b2d29199598"`);
        await queryRunner.query(`ALTER TABLE "partner_admin_entity" DROP CONSTRAINT "FK_b2a8240d70de9ba235015286f77"`);
        await queryRunner.query(`DROP TABLE "partner_access_entity"`);
        await queryRunner.query(`DROP TABLE "partner_admin_entity"`);
        await queryRunner.query(`DROP TABLE "user_entity"`);
        await queryRunner.query(`DROP TABLE "partner_entity"`);
        await queryRunner.query(`DROP TABLE "base_entity"`);
    }

}
