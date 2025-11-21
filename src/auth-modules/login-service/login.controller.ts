import { Body, Controller, Get, Headers, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { IsEmail, IsNotEmpty, Min } from 'class-validator';
import { LoginService } from './login.service';
import { RateLimitGuard } from 'src/common/rate-limit.guard';
import type { RequestWithId } from 'src/common/request-id.middleware';
import { CaptchaService } from 'src/common/services/captcha.service';
import { VerificationService } from 'src/auth/services/verification.service';

export class LoginDto {
    @IsEmail()
    email: string;
    @IsNotEmpty()
    password: string;
}

export class RefreshTokenDto {
    @IsNotEmpty()
    refreshToken: string;
}


@Controller('api/auth')
export class LoginControllerController {

    constructor(
        private readonly loginService: LoginService,
        private readonly captchaService: CaptchaService,
        private readonly verificationService: VerificationService,
    ) {}
   
    @Post('/login')
    @UseGuards(RateLimitGuard)
    async login(
        @Body() body: LoginDto, 
        @Req() req: RequestWithId,
        @Headers('x-captcha-token') captchaToken?: string,
    ) {
        if (captchaToken) {
             const isValid = await this.captchaService.verify(captchaToken);
             if (!isValid) {
                 throw new UnauthorizedException('Invalid Captcha');
             }
        }

        // Extract IP and User Agent from request
        const ip = req?.ip || (req?.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req?.socket?.remoteAddress || 'unknown';
        const userAgent = req?.headers['user-agent'] || 'unknown';

        console.info('login_request', { requestId: req.requestId, email: body.email });
        return await this.loginService.login(body.email, body.password, ip, userAgent);
    }

    
    @Get('/logout')
    logout() {
        return "you are logged out"
    }
    
   @Get('/reset')
   resetPassword(){
    return 'your new password you can finde in your email'
   }

   @Post('/refresh')
   async refresh(@Body() body: RefreshTokenDto) {
    return await this.loginService.refreshToken(body.refreshToken);
   }

   @Get('/verify-email')
   async verifyEmail(@Query('token') token: string) {
    if (!token) {
        throw new UnauthorizedException('Verification token is required');
    }

    await this.verificationService.verifyEmail(token);
    return { message: 'Email verified successfully' };
   }
}
