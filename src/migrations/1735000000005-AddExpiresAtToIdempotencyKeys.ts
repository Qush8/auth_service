import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpiresAtToIdempotencyKeys1735000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add expires_at column as nullable first
    await queryRunner.query(`
      ALTER TABLE auth_schema.idempotency_keys
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
    `);

    // Step 2: Update existing records to have expires_at = created_at + 24 hours
    await queryRunner.query(`
      UPDATE auth_schema.idempotency_keys
      SET expires_at = created_at + INTERVAL '24 hours'
      WHERE expires_at IS NULL;
    `);

    // Step 3: Add NOT NULL constraint now that all records have values
    await queryRunner.query(`
      ALTER TABLE auth_schema.idempotency_keys
      ALTER COLUMN expires_at SET NOT NULL;
    `);

    // Step 4: Set default for future inserts (using NOW() + 24 hours)
    await queryRunner.query(`
      ALTER TABLE auth_schema.idempotency_keys
      ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '24 hours');
    `);

    // Step 5: Create index on expires_at for efficient cleanup queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at
      ON auth_schema.idempotency_keys (expires_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS auth_schema.idx_idempotency_keys_expires_at;
    `);

    await queryRunner.query(`
      ALTER TABLE auth_schema.idempotency_keys
      DROP COLUMN IF EXISTS expires_at;
    `);
  }
}

