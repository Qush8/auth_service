import { Module } from '@nestjs/common';
import { LoginControllerController } from './login.controller';
import { LoginService } from './login.service';
import { User } from 'src/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { makeCounterProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    AuthModule,
  ],
  controllers: [LoginControllerController],
  providers: [
    LoginService,
    makeCounterProvider({
      name: 'auth_login_attempts_total',
      help: 'Total login attempts',
      labelNames: ['outcome', 'reason'],
    }),
    makeHistogramProvider({
      name: 'auth_login_duration_seconds',
      help: 'Login request duration in seconds',
      labelNames: ['outcome'],
      buckets: [0.1, 0.5, 1, 2, 5, 10], // Duration buckets in seconds
    }),
  ],
  exports: [LoginService],
})
export class LoginModule {}

