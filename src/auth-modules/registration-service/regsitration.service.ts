import { ConflictException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "src/entities/user.entity";
import * as bcrypt from "bcrypt";
import { JwtAuthService, JwtPayload } from "src/auth/services/jwt.service";
import { IdempotencyKey } from "src/entities/idempotency-key.entity";

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
    ) {}

    async register(
        email: string,
        password: string,
        username: string,
        firstName: string,
        lastName: string,
        idempotencyKey?: string,
    ): Promise<RegistrationResult> {
        // normalize email
        const normalizedEmail = email.trim().toLowerCase();

        // Idempotency check (if key is provided)
        if (idempotencyKey) {
            const existingKey = await this.idempotencyKeyRepository.findOne({
                where: { email: normalizedEmail, key: idempotencyKey },
            });

            if (existingKey && existingKey.userId && existingKey.responseToken) {
                const existingUser = await this.userRepository.findOne({
                    where: { auth_id: existingKey.userId },
                });

                if (existingUser) {
                    const expiresIn = 15 * 60;

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

        const saltOrRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltOrRounds);
       
        const newUser = this.userRepository.create({
            email: normalizedEmail,
            username,
            password_hash: hashedPassword,
            firstName,
            lastName,
            isActive: true,
        });

        const savedUser = await this.userRepository.save(newUser);

        const payload: JwtPayload = {
            sub: savedUser.auth_id,
            email: savedUser.email,
            username: savedUser.username,
        };

        const accessToken = await this.jwtAuthService.generateAccessToken(payload);

        const expiresIn = 15 * 60; 

        // Store idempotency record if key is provided
        if (idempotencyKey) {
            const keyRecord = this.idempotencyKeyRepository.create({
                email: normalizedEmail,
                key: idempotencyKey,
                userId: savedUser.auth_id,
                responseToken: accessToken,
            });
            await this.idempotencyKeyRepository.save(keyRecord);
        }

        return {
            user: savedUser,
            accessToken,
            expiresIn,
        };
    }

}