import { MigrationInterface, QueryRunner } from 'typeorm';

export class bloomBackend1697818259254 implements MigrationInterface {
  name = 'bloomBackend1697818259254';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "session" DROP CONSTRAINT "FK_2440b236e81d633ff0613ae59d4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_user" DROP CONSTRAINT "FK_3014902f31f2a83ec475d75bec8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_user" DROP CONSTRAINT "FK_5452e53b773936e51ff0e96d064"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_admin" DROP CONSTRAINT "FK_825f3ea183aebdb95a52f1f972c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_admin" DROP CONSTRAINT "FK_c7ee0521b73218dd1f0b13e23d5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "therapy_session" DROP CONSTRAINT "FK_95b7041e4d05e914cde6b3753d0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_access" DROP CONSTRAINT "FK_60f11a3686ca313f1ac25f689f9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_access" DROP CONSTRAINT "FK_e25f0b4b2c6fbddc8375b02f73e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_user" DROP CONSTRAINT "FK_0feee04ab572b223d511672be81"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_user" DROP CONSTRAINT "FK_cdf67f6c499d7a4c7b4d1524850"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_user" DROP CONSTRAINT "FK_062e03d78da22a7bd9becbfaaac"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_partner" DROP CONSTRAINT "FK_4799c98d625acaae457c7dd23da"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_partner" DROP CONSTRAINT "FK_96575d601e92c89fa881d2eb128"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" ADD CONSTRAINT "FK_2440b236e81d633ff0613ae59d4" FOREIGN KEY ("courseId") REFERENCES "course"("courseId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_user" ADD CONSTRAINT "FK_5452e53b773936e51ff0e96d064" FOREIGN KEY ("sessionId") REFERENCES "session"("sessionId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_user" ADD CONSTRAINT "FK_3014902f31f2a83ec475d75bec8" FOREIGN KEY ("courseUserId") REFERENCES "course_user"("courseUserId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_admin" ADD CONSTRAINT "FK_825f3ea183aebdb95a52f1f972c" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_admin" ADD CONSTRAINT "FK_c7ee0521b73218dd1f0b13e23d5" FOREIGN KEY ("partnerId") REFERENCES "partner"("partnerId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "therapy_session" ADD CONSTRAINT "FK_95b7041e4d05e914cde6b3753d0" FOREIGN KEY ("partnerAccessId") REFERENCES "partner_access"("partnerAccessId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_access" ADD CONSTRAINT "FK_60f11a3686ca313f1ac25f689f9" FOREIGN KEY ("partnerId") REFERENCES "partner"("partnerId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_access" ADD CONSTRAINT "FK_e25f0b4b2c6fbddc8375b02f73e" FOREIGN KEY ("partnerAdminId") REFERENCES "partner_admin"("partnerAdminId") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_user" ADD CONSTRAINT "FK_cdf67f6c499d7a4c7b4d1524850" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("subscriptionId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_user" ADD CONSTRAINT "FK_0feee04ab572b223d511672be81" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_user" ADD CONSTRAINT "FK_062e03d78da22a7bd9becbfaaac" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_partner" ADD CONSTRAINT "FK_96575d601e92c89fa881d2eb128" FOREIGN KEY ("partnerId") REFERENCES "partner"("partnerId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_partner" ADD CONSTRAINT "FK_4799c98d625acaae457c7dd23da" FOREIGN KEY ("courseId") REFERENCES "course"("courseId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course_partner" DROP CONSTRAINT "FK_4799c98d625acaae457c7dd23da"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_partner" DROP CONSTRAINT "FK_96575d601e92c89fa881d2eb128"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_user" DROP CONSTRAINT "FK_062e03d78da22a7bd9becbfaaac"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_user" DROP CONSTRAINT "FK_0feee04ab572b223d511672be81"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_user" DROP CONSTRAINT "FK_cdf67f6c499d7a4c7b4d1524850"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_access" DROP CONSTRAINT "FK_e25f0b4b2c6fbddc8375b02f73e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_access" DROP CONSTRAINT "FK_60f11a3686ca313f1ac25f689f9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "therapy_session" DROP CONSTRAINT "FK_95b7041e4d05e914cde6b3753d0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_admin" DROP CONSTRAINT "FK_c7ee0521b73218dd1f0b13e23d5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_admin" DROP CONSTRAINT "FK_825f3ea183aebdb95a52f1f972c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_user" DROP CONSTRAINT "FK_3014902f31f2a83ec475d75bec8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_user" DROP CONSTRAINT "FK_5452e53b773936e51ff0e96d064"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" DROP CONSTRAINT "FK_2440b236e81d633ff0613ae59d4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_partner" ADD CONSTRAINT "FK_96575d601e92c89fa881d2eb128" FOREIGN KEY ("partnerId") REFERENCES "partner"("partnerId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_partner" ADD CONSTRAINT "FK_4799c98d625acaae457c7dd23da" FOREIGN KEY ("courseId") REFERENCES "course"("courseId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_user" ADD CONSTRAINT "FK_062e03d78da22a7bd9becbfaaac" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_user" ADD CONSTRAINT "FK_cdf67f6c499d7a4c7b4d1524850" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("subscriptionId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_user" ADD CONSTRAINT "FK_0feee04ab572b223d511672be81" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_access" ADD CONSTRAINT "FK_e25f0b4b2c6fbddc8375b02f73e" FOREIGN KEY ("partnerAdminId") REFERENCES "partner_admin"("partnerAdminId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_access" ADD CONSTRAINT "FK_60f11a3686ca313f1ac25f689f9" FOREIGN KEY ("partnerId") REFERENCES "partner"("partnerId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "therapy_session" ADD CONSTRAINT "FK_95b7041e4d05e914cde6b3753d0" FOREIGN KEY ("partnerAccessId") REFERENCES "partner_access"("partnerAccessId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_admin" ADD CONSTRAINT "FK_c7ee0521b73218dd1f0b13e23d5" FOREIGN KEY ("partnerId") REFERENCES "partner"("partnerId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_admin" ADD CONSTRAINT "FK_825f3ea183aebdb95a52f1f972c" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_user" ADD CONSTRAINT "FK_5452e53b773936e51ff0e96d064" FOREIGN KEY ("sessionId") REFERENCES "session"("sessionId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_user" ADD CONSTRAINT "FK_3014902f31f2a83ec475d75bec8" FOREIGN KEY ("courseUserId") REFERENCES "course_user"("courseUserId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" ADD CONSTRAINT "FK_2440b236e81d633ff0613ae59d4" FOREIGN KEY ("courseId") REFERENCES "course"("courseId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
