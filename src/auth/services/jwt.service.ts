import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

export interface JwtPayload {
  sub: string; // user auth_id
  email: string;
  username: string;
}

@Injectable()
export class JwtAuthService {
  constructor(private readonly jwtService: NestJwtService) {}

  /**
   * Generate access token (short-lived)
   */
  async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'your-super-secret-access-token-key-change-this-in-production',
      expiresIn: '15m',
    });
  }

  /**
   * Generate refresh token (long-lived)
   */
  async generateRefreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-token-key-change-this-in-production',
      expiresIn: '7d',
    });
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET || 'your-super-secret-access-token-key-change-this-in-production',
      });
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-token-key-change-this-in-production',
      });
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Hash refresh token before storing in database
   */
  async hashRefreshToken(token: string): Promise<string> {
    const saltOrRounds = 12;
    return bcrypt.hash(token, saltOrRounds);
  }

  /**
   * Compare refresh token with hashed version
   */
  async compareRefreshToken(token: string, hashedToken: string): Promise<boolean> {
    return bcrypt.compare(token, hashedToken);
  }
}
