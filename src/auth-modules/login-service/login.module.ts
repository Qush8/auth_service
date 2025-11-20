import { Module } from '@nestjs/common';
import { LoginControllerController } from './login.controller';
import { LoginService } from './login.service';
import { User } from 'src/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthService } from 'src/auth/services/jwt.service';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'your-super-secret-access-token-key-change-this-in-production',
      signOptions: {
        expiresIn: '15m',
      },
    }),
  ],
  controllers: [LoginControllerController],
  providers: [LoginService, JwtAuthService, JwtStrategy],
  exports: [LoginService],
})
export class LoginModule {}

