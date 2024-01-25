import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1706174260018 implements MigrationInterface {
  name = 'bloomBackend1706174260018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "serviceEmailsPermission" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "contactPermission" SET DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "contactPermission" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "serviceEmailsPermission"`);
  }
}
