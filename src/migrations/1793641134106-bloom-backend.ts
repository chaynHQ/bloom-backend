import { MigrationInterface, QueryRunner } from 'typeorm';

export class BloomBackend1793641134106 implements MigrationInterface {
  name = 'BloomBackend1793641134106';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "course_resource" ("courseId" uuid NOT NULL, "resourceId" uuid NOT NULL, CONSTRAINT "PK_b110ff00efd4569aeac3a71ffd7" PRIMARY KEY ("courseId", "resourceId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7decc4cb7f7ae89b2991bb7b5c" ON "course_resource" ("courseId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1de403b730bfcd4a4bb4561d9c" ON "course_resource" ("resourceId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "course_resource" ADD CONSTRAINT "FK_7decc4cb7f7ae89b2991bb7b5cb" FOREIGN KEY ("courseId") REFERENCES "course"("courseId") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_resource" ADD CONSTRAINT "FK_1de403b730bfcd4a4bb4561d9c7" FOREIGN KEY ("resourceId") REFERENCES "resource"("resourceId") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course_resource" DROP CONSTRAINT "FK_1de403b730bfcd4a4bb4561d9c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_resource" DROP CONSTRAINT "FK_7decc4cb7f7ae89b2991bb7b5cb"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_1de403b730bfcd4a4bb4561d9c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7decc4cb7f7ae89b2991bb7b5c"`);
    await queryRunner.query(`DROP TABLE "course_resource"`);
  }
}
