import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1695059293020 implements MigrationInterface {
  name = 'bloomBackend1695059293020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "therapy_session" ADD "userId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "therapy_session" ADD CONSTRAINT "FK_58700a8a5d47651d0e895a86b4e" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "therapy_session" DROP CONSTRAINT "FK_58700a8a5d47651d0e895a86b4e"`,
    );
    await queryRunner.query(`ALTER TABLE "therapy_session" DROP COLUMN "userId"`);
  }
}
