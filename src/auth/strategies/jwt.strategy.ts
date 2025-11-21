import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface JwtPayload {
  sub: string; // user auth_id
  email: string;
  username: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    const publicKeyPath = configService.get<string>('JWT_PUBLIC_KEY_PATH') || path.join(process.cwd(), 'secrets/public.pem');
    let secretOrKey: string;
    let algorithms: string[] = ['HS256'];

    if (fs.existsSync(publicKeyPath)) {
        secretOrKey = fs.readFileSync(publicKeyPath, 'utf8');
        algorithms = ['RS256'];
    } else {
        secretOrKey = configService.get<string>('JWT_ACCESS_SECRET') || 'your-super-secret-access-token-key-change-this-in-production';
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
      algorithms,
      audience: configService.get<string>('JWT_AUDIENCE') || 'reeltask',
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { auth_id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    return user;
  }
}
