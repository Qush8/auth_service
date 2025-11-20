import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "src/entities/user.entity";
import * as bcrypt from 'bcrypt';

@Injectable()
export class  RegistrationService {

   
    

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    

    async register (
        email: string,
        password: string,
        username: string,
        firstName: string,
        lastName: string,
    ): Promise<string> {
        const saltOrRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltOrRounds);
       
        const newUser = this.userRepository.create({
            email,
            username,
            password_hash: hashedPassword,
            firstName,
            lastName,
            isActive: true,
        });

            await this.userRepository.save(newUser);

        return "user registration was success";
    }

}