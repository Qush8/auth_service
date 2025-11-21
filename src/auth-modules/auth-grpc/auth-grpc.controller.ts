import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { JwtAuthService, JwtPayload } from 'src/auth/services/jwt.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';

interface VerifyTokenRequest {
  token: string;
}

interface VerifyTokenResponse {
  valid: boolean;
  user?: {
    user_id: string;
    email: string;
    username: string;
    is_active: boolean;
    email_verified: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface GetUserByIdRequest {
  user_id: string;
}

interface GetUserByIdResponse {
  user?: {
    user_id: string;
    email: string;
    username: string;
    is_active: boolean;
    email_verified: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface ValidateUserRequest {
  user_id: string;
}

interface ValidateUserResponse {
  valid: boolean;
  is_active: boolean;
  error?: {
    code: string;
    message: string;
  };
}

@Controller()
export class AuthGrpcController {
  private readonly logger = new Logger(AuthGrpcController.name);

  constructor(
    private readonly jwtAuthService: JwtAuthService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @GrpcMethod('AuthService', 'VerifyToken')
  async verifyToken(data: VerifyTokenRequest): Promise<VerifyTokenResponse> {
    try {
      const payload = await this.jwtAuthService.verifyAccessToken(data.token);
      const user = await this.userRepository.findOne({
        where: { auth_id: payload.sub },
      });

      if (!user) {
        return {
          valid: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        };
      }

      if (!user.isActive) {
        return {
          valid: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User account is inactive',
          },
        };
      }

      return {
        valid: true,
        user: {
          user_id: user.auth_id,
          email: user.email,
          username: user.username,
          is_active: user.isActive,
          email_verified: user.emailVerified || false,
        },
      };
    } catch (error) {
      this.logger.warn(`Token verification failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        valid: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token verification failed',
        },
      };
    }
  }

  @GrpcMethod('AuthService', 'GetUserById')
  async getUserById(data: GetUserByIdRequest): Promise<GetUserByIdResponse> {
    try {
      const user = await this.userRepository.findOne({
        where: { auth_id: data.user_id },
      });

      if (!user) {
        return {
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        };
      }

      return {
        user: {
          user_id: user.auth_id,
          email: user.email,
          username: user.username,
          is_active: user.isActive,
          email_verified: user.emailVerified || false,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting user by ID: ${error instanceof Error ? error.message : String(error)}`);
      return {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user',
        },
      };
    }
  }

  @GrpcMethod('AuthService', 'ValidateUser')
  async validateUser(data: ValidateUserRequest): Promise<ValidateUserResponse> {
    try {
      const user = await this.userRepository.findOne({
        where: { auth_id: data.user_id },
      });

      if (!user) {
        return {
          valid: false,
          is_active: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        };
      }

      return {
        valid: true,
        is_active: user.isActive,
      };
    } catch (error) {
      this.logger.error(`Error validating user: ${error instanceof Error ? error.message : String(error)}`);
      return {
        valid: false,
        is_active: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate user',
        },
      };
    }
  }
}

