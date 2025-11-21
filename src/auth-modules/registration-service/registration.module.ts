import { User } from "src/entities/user.entity";
import { RegistrationController } from "./registration.controller";
import { RegistrationService } from "./regsitration.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Module } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { IdempotencyKey } from "src/entities/idempotency-key.entity";
import { makeCounterProvider, makeHistogramProvider } from "@willsoto/nestjs-prometheus";

import { HttpModule } from '@nestjs/axios';
import { UserServiceClient } from 'src/common/services/user-service-client';
import { JobsModule } from 'src/common/jobs/jobs.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, IdempotencyKey]), 
        AuthModule,
        HttpModule,
        JobsModule,
    ],
    controllers: [RegistrationController],
    providers: [
        RegistrationService,
        UserServiceClient,
        makeCounterProvider({
            name: 'auth_register_attempts_total',
            help: 'Total registration attempts',
            labelNames: ['outcome'],
        }),
        makeHistogramProvider({
            name: 'auth_register_duration_seconds',
            help: 'Registration request duration in seconds',
            labelNames: ['outcome'],
            buckets: [0.1, 0.5, 1, 2, 5, 10], // Duration buckets in seconds
        }),
    ],
    
})
export class RegistrationModule {}