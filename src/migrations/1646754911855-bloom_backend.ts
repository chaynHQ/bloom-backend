import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1646754911855 implements MigrationInterface {
  name = 'bloomBackend1646754911855';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "therapy_session" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "action" character varying NOT NULL, "clientEmail" character varying NOT NULL, "bookingCode" character varying, "clientTimezone" character varying NOT NULL, "serviceName" character varying NOT NULL, "serviceProviderName" character varying NOT NULL, "serviceProviderEmail" character varying NOT NULL, "startDateTime" TIMESTAMP WITH TIME ZONE NOT NULL, "endDateTime" TIMESTAMP WITH TIME ZONE NOT NULL, "cancelledAt" TIMESTAMP WITH TIME ZONE, "rescheduledFrom" TIMESTAMP WITH TIME ZONE, "completedAt" TIMESTAMP WITH TIME ZONE, "partnerAccessId" uuid NOT NULL, CONSTRAINT "PK_e93fdabd0275685d8e6f7d288dc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "therapy_session" ADD CONSTRAINT "FK_95b7041e4d05e914cde6b3753d0" FOREIGN KEY ("partnerAccessId") REFERENCES "partner_access"("partnerAccessId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "therapy_session" DROP CONSTRAINT "FK_95b7041e4d05e914cde6b3753d0"`,
    );
    await queryRunner.query(`DROP TABLE "therapy_session"`);
  }
}
