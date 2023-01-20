import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1674216107408 implements MigrationInterface {
  name = 'bloomBackend1674216107408';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "feature" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "featureId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, CONSTRAINT "UQ_4832be692a2dc63d67e8e93c758" UNIQUE ("name"), CONSTRAINT "PK_a9741bb40b605518c6f1541a557" PRIMARY KEY ("featureId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "partner_feature" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "partnerFeatureId" uuid NOT NULL DEFAULT uuid_generate_v4(), "active" boolean NOT NULL, "partnerId" uuid NOT NULL, "featureId" uuid NOT NULL, CONSTRAINT "PK_cfee5b8bb3477126121888ff1e6" PRIMARY KEY ("partnerFeatureId"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_feature" ADD CONSTRAINT "FK_91fa49f0f077d1d47ef581d458c" FOREIGN KEY ("partnerId") REFERENCES "partner"("partnerId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_feature" ADD CONSTRAINT "FK_c824581c685cf5969f43732ec75" FOREIGN KEY ("featureId") REFERENCES "feature"("featureId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partner_feature" DROP CONSTRAINT "FK_c824581c685cf5969f43732ec75"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_feature" DROP CONSTRAINT "FK_91fa49f0f077d1d47ef581d458c"`,
    );
    await queryRunner.query(`DROP TABLE "partner_feature"`);
    await queryRunner.query(`DROP TABLE "feature"`);
  }
}
