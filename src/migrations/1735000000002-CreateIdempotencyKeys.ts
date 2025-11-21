import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdempotencyKeys1735000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auth_schema.idempotency_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        key VARCHAR(255) NOT NULL,
        user_id UUID NULL,
        response_token VARCHAR(500) NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_idempotency_email_key UNIQUE (email, key)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS auth_schema.idempotency_keys;
    `);
  }
}


