import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { UserServiceClient } from '../services/user-service-client';
import type { ProfileCreationJobData } from './profile-creation.job';

@Processor('profile-creation')
@Injectable()
export class ProfileCreationProcessor {
  private readonly logger = new Logger(ProfileCreationProcessor.name);
  private readonly MAX_ATTEMPTS = 10; // Maximum retry attempts

  constructor(
    private readonly userServiceClient: UserServiceClient,
  ) {}

  @Process('create-profile')
  async handleProfileCreation(job: Job<ProfileCreationJobData>) {
    const { userId, username, requestId, attemptNumber = 0 } = job.data;

    this.logger.log(
      `Processing profile creation job for user ${userId} (attempt ${attemptNumber + 1})`
    );

    try {
      const success = await this.userServiceClient.createProfile(
        userId,
        username,
        requestId
      );

      if (success) {
        this.logger.log(`Profile created successfully for user ${userId}`);
        return { success: true };
      } else {
        // If still failing and haven't exceeded max attempts, throw to retry
        if (attemptNumber < this.MAX_ATTEMPTS) {
          throw new Error(`Profile creation failed for user ${userId} (attempt ${attemptNumber + 1})`);
        } else {
          this.logger.error(
            `Profile creation failed for user ${userId} after ${attemptNumber + 1} attempts. Manual intervention required.`
          );
          return { success: false, maxAttemptsReached: true };
        }
      }
    } catch (error) {
      this.logger.error(
        `Error processing profile creation job for user ${userId}`,
        error
      );

      // If haven't exceeded max attempts, throw to retry
      if (attemptNumber < this.MAX_ATTEMPTS) {
        throw error;
      }

      return { success: false, error: error.message };
    }
  }
}

