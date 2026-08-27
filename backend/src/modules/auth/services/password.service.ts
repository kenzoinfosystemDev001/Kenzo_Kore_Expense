import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  private readonly saltRounds = 12;

  /**
   * Validate password against enterprise security policy
   */
  validatePasswordPolicy(password: string): void {
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }
    if (password.length > 64) {
      throw new BadRequestException('Password must not exceed 64 characters');
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter (A-Z)');
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one lowercase letter (a-z)');
    }
    if (!/\d/.test(password)) {
      throw new BadRequestException('Password must contain at least one number (0-9)');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new BadRequestException('Password must contain at least one special character');
    }
  }

  /**
   * Securely hash password using Bcrypt with 12 salt rounds
   */
  async hashPassword(password: string): Promise<string> {
    this.validatePasswordPolicy(password);
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Securely compare candidate password with stored Bcrypt hash
   */
  async comparePassword(candidate: string, hash: string): Promise<boolean> {
    if (!candidate || !hash) return false;
    return bcrypt.compare(candidate, hash).catch(() => false);
  }
}
