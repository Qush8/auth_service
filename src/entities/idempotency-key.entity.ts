import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'idempotency_keys', schema: 'auth_schema' })
@Index(['email', 'key'], { unique: true })
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  key: string;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 500, name: 'response_token', nullable: true })
  responseToken: string | null;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ type: 'timestamptz', name: 'expires_at', nullable: false })
  expiresAt: Date;
}


