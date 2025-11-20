import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { JwtAuthService } from './services/jwt.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'your-super-secret-access-token-key-change-this-in-production',
      signOptions: {
        expiresIn: '15m',
      },
    }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [JwtAuthService, JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthService, JwtAuthGuard, PassportModule, JwtModule],
})
export class AuthModule {}

