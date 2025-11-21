import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLog1735000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS audit_schema;`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_schema.audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID,
        action VARCHAR(255) NOT NULL,
        ip VARCHAR(45),
        "userAgent" TEXT,
        outcome VARCHAR(50) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_schema.audit_logs;`);
  }
}

