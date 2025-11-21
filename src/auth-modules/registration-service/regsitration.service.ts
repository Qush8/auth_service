import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "src/entities/user.entity";
import * as bcrypt from "bcrypt";
import { JwtAuthService, JwtPayload } from "src/auth/services/jwt.service";
import { PwnedPasswordService } from "src/auth/services/pwned-password.service";
import { IdempotencyKey } from "src/entities/idempotency-key.entity";
import { AuditService } from "src/auth/services/audit.service";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Counter, Histogram } from "prom-client";
import { InjectQueue } from "@nestjs/bull";
import type { Queue } from "bull";

import { VerificationService } from "src/auth/services/verification.service";

import { UserServiceClient } from 'src/common/services/user-service-client';
import type { ProfileCreationJobData } from 'src/common/jobs/profile-creation.job';
import { UsernameValidationService } from 'src/auth/services/username-validation.service';
import { EmailMxValidationService } from 'src/auth/services/email-mx-validation.service';

interface RegistrationResult {
    user: User;
    accessToken: string;
    expiresIn: number;
}

@Injectable()
export class  RegistrationService {

   
    

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(IdempotencyKey)
        private readonly idempotencyKeyRepository: Repository<IdempotencyKey>,
        private readonly jwtAuthService: JwtAuthService,
        private readonly pwnedPasswordService: PwnedPasswordService,
        private readonly auditService: AuditService,
        private readonly userServiceClient: UserServiceClient,
        private readonly verificationService: VerificationService,
        private readonly usernameValidationService: UsernameValidationService,
        private readonly emailMxValidationService: EmailMxValidationService,
        @InjectMetric('auth_register_attempts_total')
        private readonly registerCounter: Counter<string>,
        @InjectMetric('auth_register_duration_seconds')
        private readonly registerHistogram: Histogram<string>,
        @InjectQueue('profile-creation')
        private readonly profileCreationQueue: Queue<ProfileCreationJobData>,
    ) {}

    async register(
        email: string,
        password: string,
        username: string,
        firstName: string,
        lastName: string,
        idempotencyKey?: string,
        requestId?: string,
        ip?: string,
        userAgent?: string,
    ): Promise<RegistrationResult> {
        // Start timing for latency histogram
        const startTime = Date.now();
        let outcome = 'SUCCESS';

        try {
        // normalize email
        const normalizedEmail = email.trim().toLowerCase();

            // Email MX validation (optional, behind feature flag)
            // Per documentation: "MX optional behind feature flag"
            const mxValid = await this.emailMxValidationService.validateMxRecord(normalizedEmail);
            if (!mxValid) {
                throw new BadRequestException({
                    code: "VALIDATION_ERROR",
                    fields: {
                        email: ["Email domain does not have valid MX records"],
                    },
                });
            }

        // Idempotency check (if key is provided)
        // Per documentation: "Window: 24h"
        if (idempotencyKey) {
            const now = new Date();
            const existingKey = await this.idempotencyKeyRepository.findOne({
                where: { email: normalizedEmail, key: idempotencyKey },
            });

            // Check if key exists and is not expired (24h window)
            if (existingKey && existingKey.expiresAt > now && existingKey.userId && existingKey.responseToken) {
                const existingUser = await this.userRepository.findOne({
                    where: { auth_id: existingKey.userId },
                });

                if (existingUser) {
                    const expiresIn = 15 * 60;

                    // Record latency histogram for idempotent response
                    const duration = (Date.now() - startTime) / 1000;
                    this.registerHistogram.observe({ outcome: 'SUCCESS' }, duration);

                    return {
                        user: existingUser,
                        accessToken: existingKey.responseToken,
                        expiresIn,
                    };
                }
            }
        }

        const existingUserByEmail = await this.userRepository.findOne({
            where: { email: normalizedEmail },
        });

        if (existingUserByEmail) {
            throw new ConflictException({
                code: "CONFLICT",
                field: "email",
                message: "Email already exists",
            });
        }

        const existingUserByUsername = await this.userRepository.findOne({
            where: { username },
        });

        if (existingUserByUsername) {
            throw new ConflictException({
                code: "CONFLICT",
                field: "username",
                message: "Username already exists",
            });
        }

        // Check if username is reserved
        // Per documentation: "reserved list blocked"
        if (this.usernameValidationService.isReserved(username)) {
            throw new ConflictException({
                code: "CONFLICT",
                field: "username",
                message: "Username is reserved and cannot be used",
            });
        }

        // Breached password check
        await this.pwnedPasswordService.ensureNotPwned(password);

        const pepper = process.env.PASSWORD_PEPPER || '';
        const saltOrRounds = 12;
        const hashedPassword = await bcrypt.hash(password + pepper, saltOrRounds);
       
        const newUser = this.userRepository.create({
            email: normalizedEmail,
            username,
            password_hash: hashedPassword,
            firstName,
            lastName,
            isActive: true,
        });

        const savedUser = await this.userRepository.save(newUser);

        // Call User Service to create profile
        const profileCreated = await this.userServiceClient.createProfile(
            savedUser.auth_id,
            savedUser.username,
            requestId
        );

        if (!profileCreated) {
            // Per documentation: "do NOT delete auth record once created"
            // Instead, enqueue compensating job to retry until success
            // Fire-and-forget: don't wait for queue operation to complete
            this.profileCreationQueue.add(
                'create-profile',
                {
                    userId: savedUser.auth_id,
                    username: savedUser.username,
                    requestId: requestId,
                    attemptNumber: 0,
                } as ProfileCreationJobData,
                {
                    attempts: 10, // Maximum retry attempts
                    backoff: {
                        type: 'exponential',
                        delay: 2000, // Initial delay 2 seconds
                    },
                }
            ).then(() => {
                console.warn('user_registration_profile_creation_failed', { 
                    userId: savedUser.auth_id, 
                    email: savedUser.email,
                    reason: 'User Service profile creation failed - enqueued compensating job'
                });
            }).catch((queueError) => {
                // If queue is unavailable (e.g., Redis not running), log and continue
                console.error('user_registration_profile_creation_failed_queue_error', { 
                userId: savedUser.auth_id, 
                email: savedUser.email,
                    reason: 'User Service profile creation failed - queue unavailable, manual retry required',
                    error: queueError instanceof Error ? queueError.message : String(queueError)
            });
            });

            // Continue with registration flow - profile will be created by compensating job
            // Per documentation: "enqueue compensating job to retry until success"
        }

        // Start Email Verification Flow
        const verificationToken = await this.verificationService.generateToken(savedUser.auth_id);
        // Mock sending email - In prod use Notification Service
        console.info('email_verification_sent', { 
            userId: savedUser.auth_id, 
            email: savedUser.email, 
            link: `http://localhost:3000/api/auth/verify-email?token=${verificationToken}` 
        });

        await this.auditService.log(
            savedUser.auth_id,
            'USER_REGISTER',
            'SUCCESS',
            ip || '',
            userAgent || '',
            { email: savedUser.email, username: savedUser.username }
        );
        this.registerCounter.inc({ outcome: 'SUCCESS' });

        const payload: JwtPayload = {
            sub: savedUser.auth_id,
            email: savedUser.email,
            username: savedUser.username,
        };

        const accessToken = await this.jwtAuthService.generateAccessToken(payload);

        const expiresIn = 15 * 60; 

        // Store idempotency record if key is provided
        // Per documentation: "Window: 24h"
        if (idempotencyKey) {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour window

            const keyRecord = this.idempotencyKeyRepository.create({
                email: normalizedEmail,
                key: idempotencyKey,
                userId: savedUser.auth_id,
                responseToken: accessToken,
                expiresAt,
            });
            await this.idempotencyKeyRepository.save(keyRecord);
        }

        // Record latency histogram
        const duration = (Date.now() - startTime) / 1000; // Convert to seconds
        this.registerHistogram.observe({ outcome }, duration);

        return {
            user: savedUser,
            accessToken,
            expiresIn,
        };
        } catch (error) {
            // Record latency histogram for failures
            outcome = 'FAILURE';
            const duration = (Date.now() - startTime) / 1000;
            this.registerHistogram.observe({ outcome }, duration);
            throw error;
        }
    }

}