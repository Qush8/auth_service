import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { Logger } from '@nestjs/common';
import * as path from 'path';

export interface CreateProfileRequest {
  user_id: string;
  username: string;
  request_id?: string;
}

export interface CreateProfileResponse {
  profile_id?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface UserServiceClient {
  createProfile(
    request: CreateProfileRequest,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response?: CreateProfileResponse) => void
  ): grpc.ClientUnaryCall;
}

export class GrpcClientFactory {
  private static logger = new Logger(GrpcClientFactory.name);
  private static client: UserServiceClient | null = null;

  static createClient(serviceUrl: string): UserServiceClient | null {
    if (this.client) {
      return this.client;
    }

    try {
      // Try multiple paths for proto file (dev and production)
      const possiblePaths = [
        path.join(process.cwd(), 'proto/user.proto'),
        path.join(__dirname, '../../../proto/user.proto'),
        path.join(__dirname, '../../../../proto/user.proto'),
      ];
      
      let PROTO_PATH: string | null = null;
      for (const possiblePath of possiblePaths) {
        const fs = require('fs');
        if (fs.existsSync(possiblePath)) {
          PROTO_PATH = possiblePath;
          break;
        }
      }
      
      if (!PROTO_PATH) {
        throw new Error(`Proto file not found. Tried: ${possiblePaths.join(', ')}`);
      }
      
      const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const userProto = grpc.loadPackageDefinition(packageDefinition) as any;
      const UserService = userProto.reeltask.user.v1.UserService;

      // Parse URL (format: host:port)
      const urlParts = serviceUrl.replace(/^https?:\/\//, '').split(':');
      const host = urlParts[0] || 'localhost';
      const port = urlParts[1] ? parseInt(urlParts[1], 10) : 50051;

      this.client = new UserService(
        `${host}:${port}`,
        grpc.credentials.createInsecure()
      ) as UserServiceClient;

      this.logger.log(`gRPC client connected to ${host}:${port}`);
      return this.client;
    } catch (error) {
      this.logger.error('Failed to create gRPC client', error);
      return null;
    }
  }

  static resetClient(): void {
    this.client = null;
  }
}

