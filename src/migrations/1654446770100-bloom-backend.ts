import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1654446770100 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        UPDATE public."session_user" sessionuser
	    SET "completedAt"=COALESCE(CAST(sessionuser."updatedAt" AS DATE), CURRENT_DATE)
	    WHERE sessionuser."completedAt" IS NULL AND sessionuser."completed"=true;`);
  }
  // eslint-disable-next-line
  public async down(): Promise<void> {
    // Note that it doesn't make sense to add a down as there
    // is no way of identifying which session_users were changed.
  }
}
