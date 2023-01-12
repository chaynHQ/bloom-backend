import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1673517093891 implements MigrationInterface {
  name = 'bloomBackend1673517093891';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partner_access" DROP CONSTRAINT "FK_e25f0b4b2c6fbddc8375b02f73e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_access" ALTER COLUMN "partnerAdminId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_access" ADD CONSTRAINT "FK_e25f0b4b2c6fbddc8375b02f73e" FOREIGN KEY ("partnerAdminId") REFERENCES "partner_admin"("partnerAdminId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partner_access" DROP CONSTRAINT "FK_e25f0b4b2c6fbddc8375b02f73e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_access" ALTER COLUMN "partnerAdminId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_access" ADD CONSTRAINT "FK_e25f0b4b2c6fbddc8375b02f73e" FOREIGN KEY ("partnerAdminId") REFERENCES "partner_admin"("partnerAdminId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
