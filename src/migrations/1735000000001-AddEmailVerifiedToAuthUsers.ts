import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerifiedToAuthUsers1735000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE auth_schema."AuthUsers"
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE auth_schema."AuthUsers"
      DROP COLUMN IF EXISTS email_verified;
    `);
  }
}


