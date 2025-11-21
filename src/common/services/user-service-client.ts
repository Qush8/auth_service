import { Injectable, Logger, Inject, Scope } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import { lastValueFrom } from 'rxjs';
import CircuitBreaker from 'opossum';
import pRetry from 'p-retry';
import * as grpc from '@grpc/grpc-js';
import type { RequestWithId } from '../request-id.middleware';
import { GrpcClientFactory, CreateProfileRequest, CreateProfileResponse } from './grpc-client';

interface HttpCreateProfileResponse {
  profile_id?: string;
  error?: {
    code: string;
    message: string;
  };
}

// Shared circuit breaker instance
let sharedCircuitBreaker: CircuitBreaker | null = null;

@Injectable({ scope: Scope.REQUEST })
export class UserServiceClient {
  private readonly logger = new Logger(UserServiceClient.name);
  private readonly userServiceUrl: string;
  private readonly useGrpc: boolean;
  private circuitBreaker: CircuitBreaker;
  private grpcClient: ReturnType<typeof GrpcClientFactory.createClient> | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(REQUEST) private readonly request?: RequestWithId,
  ) {
    this.userServiceUrl = this.configService.get<string>('USER_SERVICE_URL', 'http://localhost:50051');
    this.useGrpc = this.configService.get<string>('USER_SERVICE_USE_GRPC', 'true').toLowerCase() === 'true';
    
    // Initialize gRPC client if enabled
    if (this.useGrpc) {
      this.grpcClient = GrpcClientFactory.createClient(this.userServiceUrl);
      if (!this.grpcClient) {
        this.logger.warn('gRPC client initialization failed, will fallback to HTTP');
      }
    }
    
    // Use shared circuit breaker instance
    if (!sharedCircuitBreaker) {
      sharedCircuitBreaker = new CircuitBreaker(
        async (userId: string, username: string, requestId?: string, client?: UserServiceClient) => {
          return client!.callUserServiceInternal(userId, username, requestId);
        },
        {
          timeout: 1000, // 1 second timeout as per documentation
          errorThresholdPercentage: 50, // Open circuit after 50% errors
          resetTimeout: 30000, // Try again after 30 seconds
          enabled: true,
        }
      );

      // Circuit breaker event handlers
      sharedCircuitBreaker.on('open', () => {
        this.logger.warn('Circuit breaker opened - User Service is unavailable');
      });

      sharedCircuitBreaker.on('halfOpen', () => {
        this.logger.log('Circuit breaker half-open - testing User Service availability');
      });

      sharedCircuitBreaker.on('close', () => {
        this.logger.log('Circuit breaker closed - User Service is available');
      });
    }

    this.circuitBreaker = sharedCircuitBreaker;
  }

  private async callUserServiceGrpc(
    userId: string,
    username: string,
    requestId?: string
  ): Promise<boolean> {
    if (!this.grpcClient) {
      throw new Error('gRPC client not available');
    }

    return new Promise<boolean>((resolve, reject) => {
      const metadata = new grpc.Metadata();
      
      // Propagate X-Request-ID header
      if (requestId || this.request?.requestId) {
        metadata.add('x-request-id', requestId || this.request!.requestId!);
      }
      
      // Propagate traceparent if available
      if (this.request?.headers?.['traceparent']) {
        metadata.add('traceparent', this.request.headers['traceparent'] as string);
      }

      const request: CreateProfileRequest = {
        user_id: userId,
        username: username,
        request_id: requestId || this.request?.requestId,
      };

      this.grpcClient!.createProfile(
        request,
        metadata,
        (error: grpc.ServiceError | null, response?: CreateProfileResponse) => {
          if (error) {
            // Handle gRPC error codes
            if (error.code === grpc.status.ALREADY_EXISTS || error.message?.includes('CONFLICT')) {
              // 409 equivalent - treat as success (idempotency)
              this.logger.log(`Profile already exists for user ${userId} (gRPC conflict) - treating as success`);
              resolve(true);
              return;
            }
            reject(error);
            return;
          }

          if (response?.error) {
            // Handle error in response
            if (response.error.code === 'CONFLICT') {
              this.logger.log(`Profile already exists for user ${userId} (gRPC conflict) - treating as success`);
              resolve(true);
              return;
            }
            reject(new Error(response.error.message || 'Unknown error'));
            return;
          }

          // Success
          resolve(true);
        }
      );
    });
  }

  private async callUserServiceHttp(
    userId: string,
    username: string,
    requestId?: string
  ): Promise<boolean> {
    const url = `${this.userServiceUrl}/internal/users/create_profile`;
    
    const headers: Record<string, string> = {};
    
    // Propagate X-Request-ID header
    if (requestId || this.request?.requestId) {
      headers['X-Request-ID'] = requestId || this.request!.requestId!;
    }
    
    // Propagate traceparent if available
    if (this.request?.headers?.['traceparent']) {
      headers['traceparent'] = this.request.headers['traceparent'] as string;
    }

    try {
      const response = await lastValueFrom(
        this.httpService.post<HttpCreateProfileResponse>(
          url,
          {
          user_id: userId,
          username: username,
            request_id: requestId || this.request?.requestId,
          },
          {
            timeout: 1000, // 1 second timeout as per documentation (500ms-1s range)
            headers,
          }
        )
      );
      
      return true;
    } catch (error: any) {
      // Handle 409 Conflict - treat as success (idempotency)
      if (error.response?.status === 409) {
        this.logger.log(`Profile already exists for user ${userId} (409 conflict) - treating as success`);
        return true;
      }

      // Re-throw for retry logic
      throw error;
    }
  }

  private async callUserServiceInternal(userId: string, username: string, requestId?: string): Promise<boolean> {
    // Try gRPC first if enabled and available, otherwise fallback to HTTP
    if (this.useGrpc && this.grpcClient) {
      try {
        return await this.callUserServiceGrpc(userId, username, requestId);
      } catch (error) {
        this.logger.warn(`gRPC call failed, falling back to HTTP: ${error}`);
        // Fallback to HTTP
        return await this.callUserServiceHttp(userId, username, requestId);
      }
    }

    // Use HTTP
    return await this.callUserServiceHttp(userId, username, requestId);
  }

  async createProfile(userId: string, username: string, requestId?: string): Promise<boolean> {
    const effectiveRequestId = requestId || this.request?.requestId;

    try {
      // Use p-retry for exponential backoff (3 retries as per documentation)
      const result = await pRetry(
        async () => {
          // Use circuit breaker to call the service
          return await this.circuitBreaker.fire(userId, username, effectiveRequestId, this);
        },
        {
          retries: 3, // 3 retries as per documentation
          factor: 2, // Exponential backoff factor
          minTimeout: 100, // Initial delay 100ms
          maxTimeout: 1000, // Max delay 1s
          onFailedAttempt: (error) => {
            this.logger.warn(
              `Attempt ${error.attemptNumber} failed for user ${userId}. ${error.retriesLeft} retries left.`,
              error instanceof Error ? error.message : String(error)
            );
          },
        }
      );

      return result;
    } catch (error: any) {
      // Check if it's a network error (service unavailable) vs other errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNetworkError = 
        error.code === 'ECONNREFUSED' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND' ||
        error.code === grpc.status.UNAVAILABLE ||
        errorMessage?.includes('connect') || 
        errorMessage?.includes('ECONNREFUSED') ||
        errorMessage?.includes('timeout') ||
        errorMessage?.includes('Network Error') ||
        errorMessage?.includes('Breaker is open') ||
        errorMessage?.includes('circuit breaker') ||
        (!error.response && error.request);

      // Handle 409 Conflict - treat as success (idempotency)
      if (error.response?.status === 409 || error.code === grpc.status.ALREADY_EXISTS) {
        this.logger.log(`Profile already exists for user ${userId} (409 conflict) - treating as success`);
        return true;
      }
      
      if (isNetworkError) {
        this.logger.warn(`User Service unavailable for user ${userId} after retries. Service may not be running.`);
      } else {
        this.logger.error(`Failed to create profile for user ${userId} after retries`, error instanceof Error ? error.message : String(error));
      }
      
      // In dev mode, if USER_SERVICE_BYPASS is set, allow registration without profile
      const bypassEnabled = this.configService.get<string>('USER_SERVICE_BYPASS') === 'true';
      
      if (bypassEnabled && isNetworkError) {
        this.logger.warn(`Bypassing User Service (dev mode) for user ${userId}`);
        return true; // Bypass in dev mode
      }
      
      // Return false to indicate failure - registration service will handle compensating job
      return false;
    }
  }
}
