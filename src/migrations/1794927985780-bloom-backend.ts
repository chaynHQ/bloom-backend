import { MigrationInterface, QueryRunner } from 'typeorm';

export class BloomBackend1794927985780 implements MigrationInterface {
  name = 'BloomBackend1794927985780';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "partner" ADD "parentId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "partner" ADD CONSTRAINT "FK_aa5fba59efbd487da6a660b12ba" FOREIGN KEY ("parentId") REFERENCES "partner"("partnerId") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partner" DROP CONSTRAINT "FK_aa5fba59efbd487da6a660b12ba"`,
    );
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "parentId"`);
  }
}
