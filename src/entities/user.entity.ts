import { Entity, Column, PrimaryGeneratedColumn, Unique, Index } from 'typeorm';

@Entity({ name: 'AuthUsers', schema: 'auth_schema' })
@Index('idx_authusers_email', ['email'])
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'auth_id' })
  auth_id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'boolean', name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  password: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  password_hash: string;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'NOW()' })
  created_at: Date;

  @Column({ type: 'timestamptz', name: 'last_login', nullable: true })
  last_login: Date | null;

  @Column({ type: 'varchar', length: 500, name: 'hashedRefreshToken', nullable: true })
  hashedRefreshToken: string | null;
}

