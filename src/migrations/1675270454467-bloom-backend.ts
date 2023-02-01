import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1675270454467 implements MigrationInterface {
  name = 'bloomBackend1675270454467';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscription" DROP COLUMN "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "subscription" DROP COLUMN "createdAt"`);
  }
}
