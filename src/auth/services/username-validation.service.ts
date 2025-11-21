import { Injectable } from '@nestjs/common';

@Injectable()
export class UsernameValidationService {
  // Reserved usernames that should be blocked
  // Per documentation: "reserved list blocked"
  private readonly reservedUsernames = new Set([
    // System/admin usernames
    'admin',
    'administrator',
    'root',
    'system',
    'sys',
    
    // Service/API usernames
    'api',
    'service',
    'services',
    'www',
    'mail',
    'email',
    'support',
    'help',
    'info',
    'contact',
    'about',
    'terms',
    'privacy',
    'legal',
    
    // Common reserved names
    'null',
    'undefined',
    'true',
    'false',
    'test',
    'testing',
    'demo',
    'example',
    'sample',
    
    // Auth-related
    'auth',
    'login',
    'logout',
    'register',
    'registration',
    'signup',
    'signin',
    'signout',
    'password',
    'reset',
    'verify',
    'verification',
    
    // User management
    'user',
    'users',
    'account',
    'accounts',
    'profile',
    'profiles',
    'settings',
    'admin',
    'moderator',
    'mod',
    
    // Common paths
    'home',
    'index',
    'dashboard',
    'app',
    'application',
    'blog',
    'news',
    'feed',
    'search',
    'explore',
    
    // Reserved for future use
    'reeltask',
    'reeltask-admin',
    'reeltask-api',
  ]);

  /**
   * Check if username is reserved
   * Per documentation: "reserved list blocked"
   */
  isReserved(username: string): boolean {
    const normalizedUsername = username.toLowerCase().trim();
    return this.reservedUsernames.has(normalizedUsername);
  }

  /**
   * Validate username against reserved list
   * Throws ConflictException if username is reserved
   */
  validateNotReserved(username: string): void {
    if (this.isReserved(username)) {
      throw new Error('RESERVED_USERNAME');
    }
  }
}

