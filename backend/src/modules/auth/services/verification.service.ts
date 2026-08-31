import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from './email.service';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Compute deterministic SHA-256 hash for secure token/OTP lookup and comparison
   */
  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp.trim()).digest('hex');
  }

  /**
   * Generate, store, and dispatch a secure verification challenge (OTP) for activation or password reset.
   * STRICT GUARANTEE: Never reports success unless the email is successfully dispatched via SMTP.
   */
  async createChallenge(email: string, purpose: 'ACTIVATION' | 'PASSWORD_RESET'): Promise<{ success: boolean; message: string; expiresInSeconds: number }> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Rate limiting: 5-second cooldown to prevent double clicks while allowing retries
    const recentChallenge = await this.prisma.verificationChallenge.findFirst({
      where: {
        email: cleanEmail,
        purpose,
        createdAt: { gte: new Date(Date.now() - 5 * 1000) }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (recentChallenge) {
      throw new BadRequestException('Please wait a few seconds before requesting another verification code.');
    }

    // 2. Invalidate previous unused challenges for this email and purpose
    await this.prisma.verificationChallenge.updateMany({
      where: {
        email: cleanEmail,
        purpose,
        usedAt: null,
      },
      data: {
        usedAt: new Date(), // Mark previous challenges as expired
      }
    });

    // 3. Generate cryptographically secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const codeHash = this.hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    const challengeRecord = await this.prisma.verificationChallenge.create({
      data: {
        email: cleanEmail,
        codeHash,
        purpose,
        attempts: 0,
        maxAttempts: this.MAX_ATTEMPTS,
        expiresAt,
      }
    });

    // 4. Dispatch Email via SMTP Transport
    const emailDelivered = await this.emailService.sendVerificationOtp(cleanEmail, rawOtp, purpose);

    if (!emailDelivered) {
      // Invalidate the record if transmission failed so user is not stuck with an unreachable challenge
      await this.prisma.verificationChallenge.delete({
        where: { id: challengeRecord.id },
      }).catch(() => null);

      this.logger.error(`[VERIFICATION_DISPATCH_FAILED] Could not deliver OTP email to ${cleanEmail}`);
      throw new InternalServerErrorException(
        'We verified your company account, but we could not send the verification email. Please try again shortly.'
      );
    }

    this.logger.log(`[VERIFICATION_DISPATCH] 6-digit OTP challenge successfully dispatched to ${cleanEmail} (purpose: ${purpose})`);

    return {
      success: true,
      message: `A 6-digit verification code has been dispatched to ${cleanEmail}. Please check your company inbox.`,
      expiresInSeconds: this.OTP_EXPIRY_MINUTES * 60,
    };
  }

  /**
   * Verify an OTP submitted by the user.
   */
  async verifyChallenge(email: string, otp: string, purpose: 'ACTIVATION' | 'PASSWORD_RESET'): Promise<{ valid: boolean; token: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const submittedHash = this.hashOtp(otp);

    // Find the latest active challenge
    const challenge = await this.prisma.verificationChallenge.findFirst({
      where: {
        email: cleanEmail,
        purpose,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!challenge) {
      throw new BadRequestException('No active verification challenge found for this email. Please request a new code.');
    }

    // Check expiration
    if (new Date() > challenge.expiresAt) {
      await this.prisma.verificationChallenge.update({
        where: { id: challenge.id },
        data: { usedAt: new Date() }
      });
      throw new BadRequestException('The verification code has expired. Please request a new code.');
    }

    // Check attempt limit
    if (challenge.attempts >= challenge.maxAttempts) {
      await this.prisma.verificationChallenge.update({
        where: { id: challenge.id },
        data: { usedAt: new Date() }
      });
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new code.');
    }

    // Verify hash
    if (challenge.codeHash !== submittedHash) {
      await this.prisma.verificationChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } }
      });
      const remaining = challenge.maxAttempts - (challenge.attempts + 1);
      throw new BadRequestException(`Invalid verification code. ${remaining} attempt(s) remaining.`);
    }

    // Mark challenge as successfully used
    await this.prisma.verificationChallenge.update({
      where: { id: challenge.id },
      data: { usedAt: new Date() }
    });

    // Generate signed, short-lived activation token (valid 15 minutes)
    const token = this.jwtService.sign(
      {
        sub: cleanEmail,
        purpose: `STAGE_${purpose}_VERIFIED`,
        challengeId: challenge.id,
      },
      { expiresIn: '15m' }
    );

    return {
      valid: true,
      token,
    };
  }

  /**
   * Validate a short-lived verification token before allowing password creation
   */
  validateStageToken(token: string, email: string, expectedPurpose: 'ACTIVATION' | 'PASSWORD_RESET'): boolean {
    try {
      const decoded: any = this.jwtService.verify(token);
      if (!decoded || decoded.sub !== email.trim().toLowerCase()) {
        return false;
      }
      return decoded.purpose === `STAGE_${expectedPurpose}_VERIFIED`;
    } catch {
      return false;
    }
  }
}
