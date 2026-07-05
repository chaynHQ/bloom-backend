import { MigrationInterface, QueryRunner } from "typeorm";

export class BloomBackend1782989961947 implements MigrationInterface {
    name = 'BloomBackend1782989961947'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_user" DROP CONSTRAINT "FK_chat_user_userId"`);
        await queryRunner.query(`ALTER TABLE "chat_user" ADD CONSTRAINT "FK_5e9874ea3bd3524db95c2d88e53" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_user" DROP CONSTRAINT "FK_5e9874ea3bd3524db95c2d88e53"`);
        await queryRunner.query(`ALTER TABLE "chat_user" ADD CONSTRAINT "FK_chat_user_userId" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
