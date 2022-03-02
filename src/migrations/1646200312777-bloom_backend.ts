import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1646200312777 implements MigrationInterface {
    name = 'bloomBackend1646200312777'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "simply_book" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "action" character varying NOT NULL, "client_email" character varying NOT NULL, "service_name" character varying NOT NULL, "booking_code" character varying NOT NULL, "start_date_time" date NOT NULL, "cancelledAt" date, "service_provider_name" character varying NOT NULL, "client_timezone" character varying NOT NULL, "end_date_time" date NOT NULL, "service_provider_email" character varying NOT NULL, CONSTRAINT "UQ_c9c17d9cf416328a1d6acb7ceff" UNIQUE ("client_email"), CONSTRAINT "UQ_f676f13408201acb433324e26b9" UNIQUE ("booking_code"), CONSTRAINT "PK_6ef35cace0ba135c11e88e3e743" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "partner_access" ADD "active" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partner_access" DROP COLUMN "active"`);
        await queryRunner.query(`DROP TABLE "simply_book"`);
    }

}
