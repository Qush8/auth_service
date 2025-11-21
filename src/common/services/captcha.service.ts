import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly secret: string;
  private readonly enabled: boolean;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.secret = this.configService.get<string>('CAPTCHA_SECRET', '');
    this.enabled = !!this.secret;
  }

  async verify(token: string): Promise<boolean> {
    if (!this.enabled) return true; // Bypass if not configured

    try {
      // Verify with Google reCAPTCHA (example) or hCaptcha
      const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${this.secret}&response=${token}`;
      const response = await lastValueFrom(this.httpService.post(verifyUrl));
      
      return response.data.success === true;
    } catch (error) {
      this.logger.error('Captcha verification failed', error.message);
      return false;
    }
  }
}

