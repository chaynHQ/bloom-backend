import { MigrationInterface, QueryRunner } from 'typeorm';

export class BloomBackend1779522937933 implements MigrationInterface {
  name = 'BloomBackend1779522937933';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE partner_access
      SET "accessCode" = NULL
      WHERE "partnerAdminId" IS NULL
      AND "userId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
