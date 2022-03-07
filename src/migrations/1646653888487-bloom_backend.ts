import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1646653888487 implements MigrationInterface {
    name = 'bloomBackend1646653888487'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "therapy_session" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "action" character varying NOT NULL, "client_email" character varying NOT NULL, "client_timezone" character varying NOT NULL, "service_name" character varying NOT NULL, "service_provider_name" character varying NOT NULL, "service_provider_email" character varying NOT NULL, "start_date_time" date NOT NULL, "end_date_time" date NOT NULL, "cancelledAt" date, "rescheduledFrom" date, "completedAt" date, "partnerAccessId" uuid NOT NULL, CONSTRAINT "UQ_1c611aeea046721400e870d3618" UNIQUE ("client_email"), CONSTRAINT "PK_e93fdabd0275685d8e6f7d288dc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "therapy_session" ADD CONSTRAINT "FK_95b7041e4d05e914cde6b3753d0" FOREIGN KEY ("partnerAccessId") REFERENCES "partner_access"("partnerAccessId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "therapy_session" DROP CONSTRAINT "FK_95b7041e4d05e914cde6b3753d0"`);
        await queryRunner.query(`DROP TABLE "therapy_session"`);
    }

}
