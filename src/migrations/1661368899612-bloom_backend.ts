import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1661368899612 implements MigrationInterface {
  name = 'bloomBackend1661368899612';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "therapy_feedback" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "therapyFeedbackId" uuid NOT NULL DEFAULT uuid_generate_v4(), "bookingCode" character varying NOT NULL, "email" character varying NOT NULL, "isFeedbackSent" boolean NOT NULL DEFAULT false, "feedbackSentDateTime" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_579b4a0102e571396bc037f6da5" UNIQUE ("bookingCode"), CONSTRAINT "PK_3cfab042b594c22dd8eef28bdd9" PRIMARY KEY ("therapyFeedbackId"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "therapy_feedback"`);
  }
}
