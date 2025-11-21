import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

@Injectable()
export class EmailMxValidationService {
  private readonly logger = new Logger(EmailMxValidationService.name);
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    // Per documentation: "MX optional behind feature flag"
    this.enabled = this.configService.get<string>('ENABLE_EMAIL_MX_VALIDATION', 'false').toLowerCase() === 'true';
  }

  /**
   * Validate email MX record
   * Per documentation: "MX optional behind feature flag"
   * @param email - Email address to validate
   * @returns true if MX record exists or validation is disabled, false otherwise
   */
  async validateMxRecord(email: string): Promise<boolean> {
    // If MX validation is disabled, skip check
    if (!this.enabled) {
      return true;
    }

    try {
      // Extract domain from email
      const domain = email.split('@')[1];
      if (!domain) {
        this.logger.warn(`Invalid email format for MX validation: ${email}`);
        return false;
      }

      // Resolve MX records for the domain
      const mxRecords = await resolveMx(domain);
      
      // Check if any MX records exist
      if (mxRecords && mxRecords.length > 0) {
        this.logger.debug(`MX records found for ${domain}: ${mxRecords.length} records`);
        return true;
      }

      this.logger.warn(`No MX records found for domain: ${domain}`);
      return false;
    } catch (error: any) {
      // Handle DNS errors
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        this.logger.warn(`DNS resolution failed for email domain: ${email}`, error.message);
        return false;
      }

      // For other errors, log and allow (fail open for network issues)
      this.logger.error(`MX validation error for ${email}`, error);
      // Fail open - if DNS is unavailable, don't block registration
      return true;
    }
  }
}

