# Auth Service

NestJS authentication service with TypeORM, PostgreSQL, and JWT authentication.

## Project Structure

```
src/
├── auth-modules/     # Authentication modules (login, register, etc.)
├── database/         # TypeORM data source configuration
├── entities/         # TypeORM entities
├── migrations/       # Database migrations
├── app.module.ts     # Root application module
├── app.controller.ts # Root controller
├── app.service.ts    # Root service
└── main.ts           # Application entry point
```

## Installation

```bash
npm install
```

## Running the app

```bash
# development
npm run start:dev

# production mode
npm run start:prod
```

## Database Migrations

```bash
# Generate migration
npm run migration:generate -- src/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Test

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## gRPC API for Internal Services

Auth Service exposes a gRPC server on port `50052` (configurable via `GRPC_URL` environment variable) for internal microservices to use.

### Available gRPC Methods

1. **VerifyToken** - Verify JWT token and get user information
2. **GetUserById** - Get user information by user ID
3. **ValidateUser** - Validate if user exists and is active

### Proto File

The proto file is located at `proto/auth.proto`. Other services should use this file to generate their gRPC clients.

### Example: Using Auth Service from Another Service (Node.js/TypeScript)

```typescript
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { join } from 'path';

const PROTO_PATH = join(__dirname, '../../proto/auth.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const authProto: any = grpc.loadPackageDefinition(packageDefinition).reeltask.auth.v1;

// Create client
const authServiceUrl = process.env.AUTH_SERVICE_GRPC_URL || 'localhost:50052';
const client = new authProto.AuthService(
  authServiceUrl,
  grpc.credentials.createInsecure()
);

// Verify token
client.VerifyToken({ token: 'your-jwt-token' }, (error: any, response: any) => {
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (response.valid) {
    console.log('User:', response.user);
  } else {
    console.error('Invalid token:', response.error);
  }
});

// Get user by ID
client.GetUserById({ user_id: 'user-uuid' }, (error: any, response: any) => {
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (response.user) {
    console.log('User:', response.user);
  } else {
    console.error('User not found:', response.error);
  }
});

// Validate user
client.ValidateUser({ user_id: 'user-uuid' }, (error: any, response: any) => {
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (response.valid && response.is_active) {
    console.log('User is valid and active');
  }
});
```

### Environment Variables

- `GRPC_URL` - gRPC server URL (default: `0.0.0.0:50052`)
- `PORT` - HTTP REST API port (default: `3000`)

## License

UNLICENSED

