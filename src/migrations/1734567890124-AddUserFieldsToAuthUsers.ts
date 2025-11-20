import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserFieldsToAuthUsers1735000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add firstName column
    await queryRunner.query(`
      ALTER TABLE auth_schema."AuthUsers" 
      ADD COLUMN IF NOT EXISTS "firstName" VARCHAR(255) NOT NULL DEFAULT '';
    `);

    // Add lastName column
    await queryRunner.query(`
      ALTER TABLE auth_schema."AuthUsers" 
      ADD COLUMN IF NOT EXISTS "lastName" VARCHAR(255) NOT NULL DEFAULT '';
    `);

    // Add username column
    await queryRunner.query(`
      ALTER TABLE auth_schema."AuthUsers" 
      ADD COLUMN IF NOT EXISTS "username" VARCHAR(255) UNIQUE;
    `);

    // Add password column
    await queryRunner.query(`
      ALTER TABLE auth_schema."AuthUsers" 
      ADD COLUMN IF NOT EXISTS "password" VARCHAR(255);
    `);

    // Add isActive column
    await queryRunner.query(`
      ALTER TABLE auth_schema."AuthUsers" 
      ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
    `);

    // Create index for username
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_authusers_username 
      ON auth_schema."AuthUsers"(username);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS auth_schema.idx_authusers_username;
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE auth_schema."AuthUsers" 
      DROP COLUMN IF EXISTS "isActive";
    `);

    await queryRunner.query(`
      ALTER TABLE auth_schema."AuthUsers" 
      DROP COLUMN IF EXISTS "password";
    `);

    await queryRunner.query(`
      ALTER TABLE auth_schema."AuthUsers" 
      DROP COLUMN IF EXISTS "username";
    `);

    await queryRunner.query(`
      ALTER TABLE auth_schema."AuthUsers" 
      DROP COLUMN IF EXISTS "lastName";
    `);

    await queryRunner.query(`
      ALTER TABLE auth_schema."AuthUsers" 
      DROP COLUMN IF EXISTS "firstName";
    `);
  }
}

