import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class PwnedPasswordService {
  private readonly enabled = process.env.PWNED_PASSWORD_CHECK === 'true';

  async ensureNotPwned(password: string): Promise<void> {
    if (!this.enabled) return;

    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    try {
      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      if (!res.ok) {
        console.warn('pwned-password-check-failed', { status: res.status });
        return;
      }

      const text = await res.text();
      const found = text.split('\n').some((line) => line.startsWith(suffix));

      if (found) {
        throw new BadRequestException(
          'Password has appeared in known breaches (Pwned Passwords check)',
        );
      }
    } catch (err) {
      // Re-throw BadRequestException (password is pwned)
      if (err instanceof BadRequestException) {
        throw err;
      }
      // For network errors, log and fail open (allow registration)
      console.error('pwned-password-service-error', err);
      // Fail open: if service is down, allow registration but warn
    }
  }
}

