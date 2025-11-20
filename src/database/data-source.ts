// src/database/data-source.ts
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'auth_service',
  entities: [User],
  migrations: ['src/migrations/**/*.ts'],
  synchronize: false, // Must be false
});

