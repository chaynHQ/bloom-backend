import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1698136145516 implements MigrationInterface {
  name = 'bloomBackend1698136145516';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "event_log" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "eventLogId" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" TIMESTAMP WITH TIME ZONE NOT NULL, "event" character varying NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_0277be94fa0a3e3d3a4e9bed1b2" PRIMARY KEY ("eventLogId"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_log" ADD CONSTRAINT "FK_9f8b14e2906ffc001e00e3ae96f" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_log" DROP CONSTRAINT "FK_9f8b14e2906ffc001e00e3ae96f"`,
    );
    await queryRunner.query(`DROP TABLE "event_log"`);
  }
}
