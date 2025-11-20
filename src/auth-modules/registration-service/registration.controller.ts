import { Body, Controller, Post } from "@nestjs/common";
import { IsEmail, IsNotEmpty } from "class-validator";
import { RegistrationService } from "./regsitration.service";

export class RegisterDto {
    @IsEmail()
    email: string;
    @IsNotEmpty()
    password: string;
    @IsNotEmpty()
    username: string;
    @IsNotEmpty()
    firstName: string;
    @IsNotEmpty()
    lastName: string;
}

@Controller('api/auth')
export class RegistrationController {
    constructor(private readonly registrationService: RegistrationService) {}

    @Post('registration')
    async registration(@Body()registerDto: RegisterDto){
       let result = await this.registrationService.register(
           registerDto.email,
           registerDto.password,
           registerDto.username,
           registerDto.firstName,
           registerDto.lastName,
       )

       if (result == ""){
        return {
            "message":"user registration was success"
        }
       }
       return {
        "message": result , 
       }
    }
}