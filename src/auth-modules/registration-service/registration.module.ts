import { User } from "src/entities/user.entity";
import { RegistrationController } from "./registration.controller";
import { RegistrationService } from "./regsitration.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Module } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { IdempotencyKey } from "src/entities/idempotency-key.entity";

@Module({
    imports: [TypeOrmModule.forFeature([User, IdempotencyKey]), AuthModule],
    controllers: [RegistrationController],
    providers: [RegistrationService],
    
})
export class RegistrationModule {}