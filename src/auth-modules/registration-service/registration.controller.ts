import { BadRequestException, Body, Controller, Headers, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { IsEmail, IsNotEmpty, Length, Matches, MinLength } from "class-validator";
import { RegistrationService } from "./regsitration.service";

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
    constructor(private readonly registrationService: RegistrationService) {}

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async registration(
        @Body() registerDto: RegisterDto,
        @Headers('idempotency-key') idempotencyKey?: string,
    ) {
        if (!idempotencyKey) {
            throw new BadRequestException('Idempotency-Key header is required');
        }

        console.info('user_registration_attempt', { email: registerDto.email });

        const result = await this.registrationService.register(
            registerDto.email,
            registerDto.password,
            registerDto.username,
            registerDto.firstName,
            registerDto.lastName,
            idempotencyKey,
        );

        console.info('user_registered', { user_id: result.user.auth_id, email: result.user.email });

        return {
            user_id: result.user.auth_id,
            token: result.accessToken,
            expires_in: result.expiresIn,
        };
    }
}