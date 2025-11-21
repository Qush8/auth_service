import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "src/entities/user.entity";
import { JwtAuthService, JwtPayload } from "src/auth/services/jwt.service";
import * as bcrypt from 'bcrypt';
import { AuditService } from "src/auth/services/audit.service";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Counter, Histogram } from "prom-client";

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    isActive: boolean;
    message: string;
}

@Injectable()
export class LoginService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly jwtAuthService: JwtAuthService,
        private readonly auditService: AuditService,
        @InjectMetric('auth_login_attempts_total')
        private readonly loginCounter: Counter<string>,
        @InjectMetric('auth_login_duration_seconds')
        private readonly loginHistogram: Histogram<string>,
    ) {}

    async login(email: string, password: string, ip?: string, userAgent?: string): Promise<LoginResponse> {
        // Start timing for latency histogram
        const startTime = Date.now();
        let outcome = 'SUCCESS';

        try {
        const user = await this.userRepository.findOne({
            where: { email },
        });

        if (!user) {
            await this.auditService.log(null, 'USER_LOGIN', 'FAILURE', ip || '', userAgent || '', { email, reason: 'User not found' });
            this.loginCounter.inc({ outcome: 'FAILURE', reason: 'User not found' });
            throw new UnauthorizedException('Invalid email or password');
        }

        const pepper = process.env.PASSWORD_PEPPER || '';
        const isPasswordValid = await bcrypt.compare(password + pepper, user.password_hash);

        if (!isPasswordValid) {
            await this.auditService.log(user.auth_id, 'USER_LOGIN', 'FAILURE', ip || '', userAgent || '', { email, reason: 'Invalid password' });
            this.loginCounter.inc({ outcome: 'FAILURE', reason: 'Invalid password' });
            throw new UnauthorizedException('Invalid email or password');
        }

        // Generate JWT payload
        const payload: JwtPayload = {
            sub: user.auth_id,
            email: user.email,
            username: user.username,
        };

        // Generate tokens
        const accessToken = await this.jwtAuthService.generateAccessToken(payload);
        const refreshToken = await this.jwtAuthService.generateRefreshToken(payload);

        // Hash and save refresh token to database
        const hashedRefreshToken = await this.jwtAuthService.hashRefreshToken(refreshToken);
        
        // Update user with refresh token and last_login
        user.hashedRefreshToken = hashedRefreshToken;
        user.last_login = new Date();
        await this.userRepository.save(user);

        console.info('login_success', { user_id: user.auth_id, email: user.email });
            await this.auditService.log(user.auth_id, 'USER_LOGIN', 'SUCCESS', ip || '', userAgent || '', { email: user.email });
        this.loginCounter.inc({ outcome: 'SUCCESS', reason: 'OK' });

            // Record latency histogram
            const duration = (Date.now() - startTime) / 1000; // Convert to seconds
            this.loginHistogram.observe({ outcome }, duration);

        return {
            accessToken,
            refreshToken,
            isActive: user.isActive,
            message: 'login successfully',
        };
        } catch (error) {
            // Record latency histogram for failures
            outcome = 'FAILURE';
            const duration = (Date.now() - startTime) / 1000;
            this.loginHistogram.observe({ outcome }, duration);
            throw error;
        }
    }

    async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        // Verify refresh token
        const payload = await this.jwtAuthService.verifyRefreshToken(refreshToken);

        // Find user by auth_id
        const user = await this.userRepository.findOne({
            where: { auth_id: payload.sub },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('User account is deactivated');
        }

        // Verify refresh token matches stored hash
        if (!user.hashedRefreshToken) {
            throw new UnauthorizedException('Refresh token not found');
        }

        const isTokenValid = await this.jwtAuthService.compareRefreshToken(
            refreshToken,
            user.hashedRefreshToken,
        );

        if (!isTokenValid) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        // Generate new tokens
        const newPayload: JwtPayload = {
            sub: user.auth_id,
            email: user.email,
            username: user.username,
        };

        const newAccessToken = await this.jwtAuthService.generateAccessToken(newPayload);
        const newRefreshToken = await this.jwtAuthService.generateRefreshToken(newPayload);

        // Update refresh token in database (token rotation)
        const hashedNewRefreshToken = await this.jwtAuthService.hashRefreshToken(newRefreshToken);
        user.hashedRefreshToken = hashedNewRefreshToken;
        await this.userRepository.save(user);

        console.info('refresh_success', { user_id: user.auth_id, email: user.email });

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        };
    }
}