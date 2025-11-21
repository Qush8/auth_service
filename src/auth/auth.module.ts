import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from 'src/entities/user.entity';
import { JwtAuthService } from './services/jwt.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PwnedPasswordService } from './services/pwned-password.service';
import { AuditService } from './services/audit.service';
import { AuditLog } from 'src/entities/audit-log.entity';
import * as fs from 'fs';
import * as path from 'path';
import { VerificationService } from './services/verification.service';
import { EmailVerificationToken } from 'src/entities/email-verification-token.entity';
import { HttpModule } from '@nestjs/axios';
import { CaptchaService } from 'src/common/services/captcha.service';
import { UsernameValidationService } from './services/username-validation.service';
import { EmailMxValidationService } from './services/email-mx-validation.service';

@Module({
  imports: [
    HttpModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const privateKeyPath = configService.get<string>('JWT_PRIVATE_KEY_PATH') || path.join(process.cwd(), 'secrets/private.pem');
        const publicKeyPath = configService.get<string>('JWT_PUBLIC_KEY_PATH') || path.join(process.cwd(), 'secrets/public.pem');
        
        let privateKey = '';
        let publicKey = '';

        try {
            if (fs.existsSync(privateKeyPath)) {
                privateKey = fs.readFileSync(privateKeyPath, 'utf8');
            } else {
                console.warn(`JWT Private key not found at ${privateKeyPath}, falling back to insecure secret for HS256 (NOT RECOMMENDED)`);
                return {
                    secret: configService.get<string>('JWT_ACCESS_SECRET') || 'insecure-fallback-secret',
                    signOptions: { expiresIn: '15m' },
                };
            }

            if (fs.existsSync(publicKeyPath)) {
                publicKey = fs.readFileSync(publicKeyPath, 'utf8');
            }
        } catch (e) {
             console.error('Error loading JWT keys', e);
             throw e;
        }

        return {
          privateKey,
          publicKey,
          signOptions: {
            expiresIn: '15m',
            algorithm: 'RS256',
          },
        };
      },
    }),
    TypeOrmModule.forFeature([User, AuditLog, EmailVerificationToken]),
  ],
  providers: [
    JwtAuthService,
    JwtStrategy,
    JwtAuthGuard,
    PwnedPasswordService,
    AuditService,
    CaptchaService,
    VerificationService,
    UsernameValidationService,
    EmailMxValidationService,
  ],
  exports: [
    JwtAuthService,
    JwtAuthGuard,
    PassportModule,
    JwtModule,
    PwnedPasswordService,
    AuditService,
    CaptchaService,
    VerificationService,
    UsernameValidationService,
    EmailMxValidationService,
  ],
})
export class AuthModule {}

