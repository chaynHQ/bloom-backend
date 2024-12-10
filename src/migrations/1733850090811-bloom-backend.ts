import { MigrationInterface, QueryRunner } from 'typeorm';

export class BloomBackend1733850090811 implements MigrationInterface {
  name = 'BloomBackend1733850090811';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "resource_user" DROP CONSTRAINT "FK_774b61a463074cee88e57685925"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_user" DROP CONSTRAINT "FK_ea89e3c7f0126d7e9d02308c2ca"`,
    );
    await queryRunner.query(`ALTER TABLE "resource_user" ALTER COLUMN "resourceId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "resource_user" ALTER COLUMN "userId" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "resource_user" ADD CONSTRAINT "FK_774b61a463074cee88e57685925" FOREIGN KEY ("resourceId") REFERENCES "resource"("resourceId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_user" ADD CONSTRAINT "FK_ea89e3c7f0126d7e9d02308c2ca" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "resource_user" DROP CONSTRAINT "FK_ea89e3c7f0126d7e9d02308c2ca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_user" DROP CONSTRAINT "FK_774b61a463074cee88e57685925"`,
    );
    await queryRunner.query(`ALTER TABLE "resource_user" ALTER COLUMN "userId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "resource_user" ALTER COLUMN "resourceId" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "resource_user" ADD CONSTRAINT "FK_ea89e3c7f0126d7e9d02308c2ca" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_user" ADD CONSTRAINT "FK_774b61a463074cee88e57685925" FOREIGN KEY ("resourceId") REFERENCES "resource"("resourceId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
