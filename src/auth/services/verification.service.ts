import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailVerificationToken } from 'src/entities/email-verification-token.entity';
import { User } from 'src/entities/user.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class VerificationService {
  private readonly TOKEN_EXPIRY_HOURS = 24;

  constructor(
    @InjectRepository(EmailVerificationToken)
    private readonly tokenRepository: Repository<EmailVerificationToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async generateToken(userId: string): Promise<string> {
    // Generate secure random token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

    const tokenRecord = this.tokenRepository.create({
      userId,
      token,
      expiresAt,
    });

    await this.tokenRepository.save(tokenRecord);

    return token;
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenRecord = await this.tokenRepository.findOne({
      where: { token },
      relations: [], // We'll fetch user separately
    });

    if (!tokenRecord) {
      throw new NotFoundException('Invalid verification token');
    }

    if (new Date() > tokenRecord.expiresAt) {
      // Clean up expired token
      await this.tokenRepository.delete({ id: tokenRecord.id });
      throw new BadRequestException('Verification token has expired');
    }

    // Update user email_verified status
    const user = await this.userRepository.findOne({
      where: { auth_id: tokenRecord.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      // Already verified, clean up token
      await this.tokenRepository.delete({ id: tokenRecord.id });
      throw new BadRequestException('Email already verified');
    }

    user.emailVerified = true;
    await this.userRepository.save(user);

    // Delete used token
    await this.tokenRepository.delete({ id: tokenRecord.id });
  }
}
