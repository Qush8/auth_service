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

## License

UNLICENSED

