import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1686155897161 implements MigrationInterface {
  name = 'bloomBackend1686155897161';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "therapy_session" ALTER COLUMN "clientTimezone" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "therapy_session" ALTER COLUMN "clientTimezone" SET NOT NULL`,
    );
  }
}
