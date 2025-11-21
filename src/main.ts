import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { join } from 'path';

async function bootstrap() {
  // HTTP REST API (for clients)
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  
  const httpPort = process.env.PORT ?? 3000;
  await app.listen(httpPort);
  console.log(`HTTP Server listening on port ${httpPort}`);

  // gRPC Server (for internal microservices)
  const grpcUrl = process.env.GRPC_URL || '0.0.0.0:50052';
  const grpcApp = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'reeltask.auth.v1',
        protoPath: join(__dirname, '../proto/auth.proto'),
        url: grpcUrl,
      },
    },
  );

  await grpcApp.listen();
  console.log(`gRPC Server listening on ${grpcUrl}`);
}
bootstrap();
