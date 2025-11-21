import { BadRequestException, Body, Controller, Headers, HttpCode, HttpStatus, Post, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { RateLimitGuard } from "src/common/rate-limit.guard";
import { IsEmail, IsNotEmpty, Length, Matches, MinLength } from "class-validator";
import { RegistrationService } from "./regsitration.service";
import { CaptchaService } from "src/common/services/captcha.service";
import type { RequestWithId } from "src/common/request-id.middleware";

export class RegisterDto {
    @IsEmail()
    email: string;
    @IsNotEmpty()
    @MinLength(12, { message: "Password must be at least 12 characters long" })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\\da-zA-Z]).{12,}$/, {
        message:
            "Password must contain upper, lower, number and special character",
    })
    password: string;

    @IsNotEmpty()
    @Length(3, 30, { message: "Username must be between 3 and 30 characters" })
    @Matches(/^[a-zA-Z0-9_-]+$/, {
        message: "Username can contain letters, numbers, underscores and dashes",
    })
    username: string;
    @IsNotEmpty()
    firstName: string;
    @IsNotEmpty()
    lastName: string;
}

@Controller('api/auth')
export class RegistrationController {
    constructor(
        private readonly registrationService: RegistrationService,
        private readonly captchaService: CaptchaService,
    ) {}

    @Post('register')
    @UseGuards(RateLimitGuard)
    @HttpCode(HttpStatus.CREATED)
    async registration(
        @Body() registerDto: RegisterDto,
        @Headers('idempotency-key') idempotencyKey?: string,
        @Headers('x-captcha-token') captchaToken?: string,
        @Req() req?: RequestWithId,
    ) {
        if (!idempotencyKey) {
            throw new BadRequestException('Idempotency-Key header is required');
        }

        if (captchaToken) {
             const isValid = await this.captchaService.verify(captchaToken);
             if (!isValid) {
                 throw new UnauthorizedException('Invalid Captcha');
             }
        }

        console.info('user_registration_attempt', { email: registerDto.email });

        // Extract IP and User Agent from request
        const ip = req?.ip || (req?.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req?.socket?.remoteAddress || 'unknown';
        const userAgent = req?.headers['user-agent'] || 'unknown';

        const result = await this.registrationService.register(
            registerDto.email,
            registerDto.password,
            registerDto.username,
            registerDto.firstName,
            registerDto.lastName,
            idempotencyKey,
            req?.requestId,
            ip,
            userAgent,
        );

        console.info('user_registered', { user_id: result.user.auth_id, email: result.user.email });

        return {
            user_id: result.user.auth_id,
            token: result.accessToken,
            expires_in: result.expiresIn,
        };
    }
}