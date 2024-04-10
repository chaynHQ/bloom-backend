import { MigrationInterface, QueryRunner } from 'typeorm';

export class BloomBackend1712773456250 implements MigrationInterface {
  name = 'BloomBackend1712773456250';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partner_admin" DROP CONSTRAINT "FK_825f3ea183aebdb95a52f1f972c"`,
    );
    await queryRunner.query(`ALTER TABLE "partner_admin" ALTER COLUMN "userId" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "partner_admin" ADD CONSTRAINT "FK_825f3ea183aebdb95a52f1f972c" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partner_admin" DROP CONSTRAINT "FK_825f3ea183aebdb95a52f1f972c"`,
    );
    await queryRunner.query(`ALTER TABLE "partner_admin" ALTER COLUMN "userId" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "partner_admin" ADD CONSTRAINT "FK_825f3ea183aebdb95a52f1f972c" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
