import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthSchemaAndAuthUsers1734567890123
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create schema if not exists
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS auth_schema;`);

    // Create AuthUsers table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auth_schema."AuthUsers" (
        auth_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_login TIMESTAMPTZ
      );
    `);

    // Create index for fast email lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_authusers_email 
      ON auth_schema."AuthUsers"(email);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS auth_schema.idx_authusers_email;
    `);

    // Drop table
    await queryRunner.query(`
      DROP TABLE IF EXISTS auth_schema."AuthUsers";
    `);

    // Drop schema (optional - comment out if you want to keep schema)
    // await queryRunner.query(`DROP SCHEMA IF EXISTS auth_schema CASCADE;`);
  }
}

