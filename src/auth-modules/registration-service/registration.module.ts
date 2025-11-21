import { User } from "src/entities/user.entity";
import { RegistrationController } from "./registration.controller";
import { RegistrationService } from "./regsitration.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Module } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";

@Module({
    imports: [TypeOrmModule.forFeature([User]), AuthModule],
    controllers: [RegistrationController],
    providers: [RegistrationService],
    
})
export class RegistrationModule {}