import { User } from "src/entities/user.entity"
import { RegistrationController } from "./registration.controller"
import { RegistrationService } from "./regsitration.service"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Module } from "@nestjs/common"

@Module({
    imports: [TypeOrmModule.forFeature([User])],
    controllers: [RegistrationController],
    providers: [RegistrationService],
    
})
export class RegistrationModule {}