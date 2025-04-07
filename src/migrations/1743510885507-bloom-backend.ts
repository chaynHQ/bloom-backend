import { MigrationInterface, QueryRunner } from 'typeorm';

export class BloomBackend1743510885507 implements MigrationInterface {
  name = 'BloomBackend1743510885507';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "event_log" ADD "metadata" jsonb NOT NULL DEFAULT '{}'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "event_log" DROP COLUMN "metadata"`);
  }
}
