import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoginModule } from './auth-modules/login-service/login.module';
import { RegistrationModule } from './auth-modules/registration-service/registration.module';
import { AuthGrpcModule } from './auth-modules/auth-grpc/auth-grpc.module';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    PrometheusModule.register({
      path: '/metrics',
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'your-super-secret-access-token-key-change-this-in-production',
      signOptions: {
        expiresIn: '15m',
      },
    }),
    LoginModule,
    RegistrationModule,
    AuthGrpcModule,
    TypeOrmModule.forRoot({
      autoLoadEntities: true,
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'auth_service',
      entities: [],
      synchronize: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
