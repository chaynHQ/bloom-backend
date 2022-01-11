import {MigrationInterface, QueryRunner} from "typeorm";

export class bloomBackend1641937153381 implements MigrationInterface {
    name = 'bloomBackend1641937153381'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "session_user" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sessionUserId" uuid NOT NULL DEFAULT uuid_generate_v4(), "completed" boolean NOT NULL, "sessionId" uuid NOT NULL, "courseUserId" uuid NOT NULL, CONSTRAINT "PK_79d7649f75158323813916f4540" PRIMARY KEY ("sessionUserId"))`);
        await queryRunner.query(`ALTER TABLE "session_user" ADD CONSTRAINT "FK_5452e53b773936e51ff0e96d064" FOREIGN KEY ("sessionId") REFERENCES "session"("sessionId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "session_user" ADD CONSTRAINT "FK_3014902f31f2a83ec475d75bec8" FOREIGN KEY ("courseUserId") REFERENCES "course_user"("courseUserId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session_user" DROP CONSTRAINT "FK_3014902f31f2a83ec475d75bec8"`);
        await queryRunner.query(`ALTER TABLE "session_user" DROP CONSTRAINT "FK_5452e53b773936e51ff0e96d064"`);
        await queryRunner.query(`DROP TABLE "session_user"`);
    }

}
