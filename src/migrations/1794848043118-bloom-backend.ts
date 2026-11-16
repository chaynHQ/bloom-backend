import { MigrationInterface, QueryRunner } from 'typeorm';

// Partner branding lives in Storyblok, so these columns have been unused since the slug migration
// (1794836448947). The down migration restores them empty.
export class BloomBackend1794848043118 implements MigrationInterface {
  name = 'BloomBackend1794848043118';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "logo"`);
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "logoAlt"`);
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "partnershipLogo"`);
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "partnershipLogoAlt"`);
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "bloomGirlIllustration"`);
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "bloomGirlIllustrationAlt"`);
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "website"`);
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "footerLine1"`);
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "footerLine2"`);
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "facebookUrl"`);
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "twitterUrl"`);
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "instagramUrl"`);
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "youtubeUrl"`);
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "tiktokUrl"`);
    await queryRunner.query(`ALTER TABLE "partner" DROP COLUMN "githubUrl"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "partner" ADD "githubUrl" character varying`);
    await queryRunner.query(`ALTER TABLE "partner" ADD "tiktokUrl" character varying`);
    await queryRunner.query(`ALTER TABLE "partner" ADD "youtubeUrl" character varying`);
    await queryRunner.query(`ALTER TABLE "partner" ADD "instagramUrl" character varying`);
    await queryRunner.query(`ALTER TABLE "partner" ADD "twitterUrl" character varying`);
    await queryRunner.query(`ALTER TABLE "partner" ADD "facebookUrl" character varying`);
    await queryRunner.query(`ALTER TABLE "partner" ADD "footerLine2" character varying`);
    await queryRunner.query(`ALTER TABLE "partner" ADD "footerLine1" character varying`);
    await queryRunner.query(`ALTER TABLE "partner" ADD "website" character varying`);
    await queryRunner.query(
      `ALTER TABLE "partner" ADD "bloomGirlIllustrationAlt" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "partner" ADD "bloomGirlIllustration" character varying`);
    await queryRunner.query(`ALTER TABLE "partner" ADD "partnershipLogoAlt" character varying`);
    await queryRunner.query(`ALTER TABLE "partner" ADD "partnershipLogo" character varying`);
    await queryRunner.query(`ALTER TABLE "partner" ADD "logoAlt" character varying`);
    await queryRunner.query(`ALTER TABLE "partner" ADD "logo" character varying`);
  }
}
