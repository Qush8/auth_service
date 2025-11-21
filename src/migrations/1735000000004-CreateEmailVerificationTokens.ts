import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailVerificationTokens1735000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auth_schema.email_verification_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token 
      ON auth_schema.email_verification_tokens(token);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id 
      ON auth_schema.email_verification_tokens(user_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS auth_schema.idx_email_verification_tokens_user_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS auth_schema.idx_email_verification_tokens_token;`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth_schema.email_verification_tokens;`);
  }
}
