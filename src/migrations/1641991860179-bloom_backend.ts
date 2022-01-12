import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1641991860179 implements MigrationInterface {
    name = 'bloomBackend1641991860179'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partner_access" DROP CONSTRAINT "FK_25e7860a2eec1f9366fcfe3a954"`);
        await queryRunner.query(`ALTER TABLE "partner_access" DROP CONSTRAINT "UQ_25e7860a2eec1f9366fcfe3a954"`);
        await queryRunner.query(`ALTER TABLE "partner_access" ADD CONSTRAINT "FK_25e7860a2eec1f9366fcfe3a954" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partner_access" DROP CONSTRAINT "FK_25e7860a2eec1f9366fcfe3a954"`);
        await queryRunner.query(`ALTER TABLE "partner_access" ADD CONSTRAINT "UQ_25e7860a2eec1f9366fcfe3a954" UNIQUE ("userId")`);
        await queryRunner.query(`ALTER TABLE "partner_access" ADD CONSTRAINT "FK_25e7860a2eec1f9366fcfe3a954" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
