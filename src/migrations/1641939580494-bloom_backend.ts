import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1641939580494 implements MigrationInterface {
    name = 'bloomBackend1641939580494'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partner_access" DROP CONSTRAINT "FK_25e7860a2eec1f9366fcfe3a954"`);
        await queryRunner.query(`ALTER TABLE "partner_access" DROP CONSTRAINT "REL_25e7860a2eec1f9366fcfe3a95"`);
        await queryRunner.query(`ALTER TABLE "partner_access" ADD CONSTRAINT "FK_25e7860a2eec1f9366fcfe3a954" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partner_access" DROP CONSTRAINT "FK_25e7860a2eec1f9366fcfe3a954"`);
        await queryRunner.query(`ALTER TABLE "partner_access" ADD CONSTRAINT "REL_25e7860a2eec1f9366fcfe3a95" UNIQUE ("userId")`);
        await queryRunner.query(`ALTER TABLE "partner_access" ADD CONSTRAINT "FK_25e7860a2eec1f9366fcfe3a954" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
