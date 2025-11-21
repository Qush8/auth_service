import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ProfileCreationProcessor } from './profile-creation.processor';
import { HttpModule } from '@nestjs/axios';
import { UserServiceClient } from '../services/user-service-client';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'profile-creation',
      defaultJobOptions: {
        attempts: 10, // Maximum retry attempts
        backoff: {
          type: 'exponential',
          delay: 2000, // Initial delay 2 seconds
        },
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for manual inspection
      },
    }),
    HttpModule,
  ],
  providers: [ProfileCreationProcessor, UserServiceClient],
  exports: [BullModule],
})
export class JobsModule {}

