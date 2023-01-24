import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1674574860578 implements MigrationInterface {
  name = 'bloomBackend1674574860578';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "subscription_user" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "subscriptionUserId" uuid NOT NULL DEFAULT uuid_generate_v4(), "subscriptionId" uuid NOT NULL, "userId" uuid NOT NULL, "cancelledAt" date, CONSTRAINT "PK_49bc0c05ff92e69e1da10d247b7" PRIMARY KEY ("subscriptionUserId"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_user" ADD CONSTRAINT "FK_cdf67f6c499d7a4c7b4d1524850" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("subscriptionId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_user" ADD CONSTRAINT "FK_0feee04ab572b223d511672be81" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_user" DROP CONSTRAINT "FK_0feee04ab572b223d511672be81"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_user" DROP CONSTRAINT "FK_cdf67f6c499d7a4c7b4d1524850"`,
    );
    await queryRunner.query(`DROP TABLE "subscription_user"`);
  }
}
