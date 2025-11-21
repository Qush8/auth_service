import {
    CanActivate,
    ExecutionContext,
    Injectable,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  import { Request } from 'express';
  
  type Key = string;
  
  interface RateEntry {
    timestamps: number[]; // ms
  }
  
  @Injectable()
  export class RateLimitGuard implements CanActivate {
    private static readonly WINDOW_MS = 60 * 1000; // 1 წუთი
    private static readonly MAX_REQUESTS = 5;
  
    private static buckets = new Map<Key, RateEntry>();
  
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest<Request>();
      const now = Date.now();
  
      const ip = (req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown').toString();
      const path = req.path;
  
      let key = `${ip}:${path}`;
  
      // რეგისტრაციაზე per-email-იც გავითვალისწინოთ
      if (path === '/api/auth/register' && (req.body as any)?.email) {
        const email = String((req.body as any).email).toLowerCase().trim();
        key = `${ip}:${path}:${email}`;
      }
  
      const bucket = RateLimitGuard.buckets.get(key) ?? { timestamps: [] };
  
      // ძველი ცდების გაწმენდა
      bucket.timestamps = bucket.timestamps.filter(
        (ts) => now - ts < RateLimitGuard.WINDOW_MS,
      );
  
      if (bucket.timestamps.length >= RateLimitGuard.MAX_REQUESTS) {
        const retryAfterSec = Math.ceil(
          (RateLimitGuard.WINDOW_MS - (now - bucket.timestamps[0])) / 1000,
        );
  
        throw new HttpException(
          {
            code: 'RATE_LIMITED',
            retry_after: retryAfterSec,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
  
      bucket.timestamps.push(now);
      RateLimitGuard.buckets.set(key, bucket);
  
      return true;
    }
  }