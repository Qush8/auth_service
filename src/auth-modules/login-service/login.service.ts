import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "src/entities/user.entity";
import { JwtAuthService, JwtPayload } from "src/auth/services/jwt.service";
import * as bcrypt from 'bcrypt';

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
    ) {}

    async login(email: string, password: string): Promise<LoginResponse> {
        const user = await this.userRepository.findOne({
            where: { email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
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

        return {
            accessToken,
            refreshToken,
            isActive: user.isActive,
            message: 'login successfully',
        };
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