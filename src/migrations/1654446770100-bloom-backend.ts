import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1654446770100 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        UPDATE public."session_user" sessionuser
	    SET "completedAt"=COALESCE(CAST(sessionuser."updatedAt" AS DATE), CURRENT_DATE)
	    WHERE sessionuser."completedAt" IS NULL AND sessionuser."completed"=true;`);
  }

  public async down(): Promise<void> {}
}
