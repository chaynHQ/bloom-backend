import { MigrationInterface, QueryRunner } from "typeorm";

export class BloomBackend1757000000000 implements MigrationInterface {
    name = 'BloomBackend1757000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_64c33fea871de4f4b78e5976c22"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "crispTokenId"`);
        await queryRunner.query(`
            CREATE TABLE "chat_user" (
                "chatUserId" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "userId" uuid NOT NULL,
                "frontContactId" character varying,
                "frontConversationId" character varying,
                "lastMessageSentAt" TIMESTAMP WITH TIME ZONE,
                "lastMessageReceivedAt" TIMESTAMP WITH TIME ZONE,
                "lastMessageReadAt" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_chat_user" PRIMARY KEY ("chatUserId"),
                CONSTRAINT "REL_chat_user_userId" UNIQUE ("userId"),
                CONSTRAINT "FK_chat_user_userId" FOREIGN KEY ("userId")
                    REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "chat_user"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "crispTokenId" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_64c33fea871de4f4b78e5976c22" UNIQUE ("crispTokenId")`);
    }

}
