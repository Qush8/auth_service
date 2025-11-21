import { ConflictException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "src/entities/user.entity";
import * as bcrypt from "bcrypt";
import { JwtAuthService, JwtPayload } from "src/auth/services/jwt.service";

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
        private readonly jwtAuthService: JwtAuthService,
    ) {}

    async register(
        email: string,
        password: string,
        username: string,
        firstName: string,
        lastName: string,
    ): Promise<RegistrationResult> {
        // normalize email
        const normalizedEmail = email.trim().toLowerCase();

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

        return {
            user: savedUser,
            accessToken,
            expiresIn,
        };
    }

}