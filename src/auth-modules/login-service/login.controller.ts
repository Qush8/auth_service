import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsEmail, IsNotEmpty, Min } from 'class-validator';
import { LoginService } from './login.service';

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

    constructor(private readonly loginService: LoginService) {}
   
    @Post('/login')
    async login(@Body() body: LoginDto) {
        console.log('login request:', { email: body.email });
        return await this.loginService.login(body.email, body.password);
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
}
