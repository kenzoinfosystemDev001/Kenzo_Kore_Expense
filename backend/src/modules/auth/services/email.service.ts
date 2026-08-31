import { Injectable, Logger } from '@nestjs/common';
import { ResendEmailProvider } from './providers/resend-email.provider';
import { SmtpEmailProvider } from './providers/smtp-email.provider';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly resendProvider: ResendEmailProvider,
    private readonly smtpProvider: SmtpEmailProvider,
  ) {
    if (process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY) {
      this.logger.log('Primary Email Provider configured: Resend HTTPS REST API (Port 443)');
    } else {
      this.logger.warn('RESEND_API_KEY not detected. Set RESEND_API_KEY in your Render dashboard for production delivery.');
    }
  }

  /**
   * Dispatches a single-use 6-digit verification code using Resend HTTPS API (Port 443)
   */
  async sendVerificationOtp(to: string, otp: string, purpose: 'ACTIVATION' | 'PASSWORD_RESET'): Promise<boolean> {
    const title = purpose === 'ACTIVATION' ? 'Account Activation Verification Code' : 'Password Reset Verification Code';
    const cleanEmail = to.trim().toLowerCase();

    const subject = `[Kenzo Kore Expense] ${title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #030712; color: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid #00C8FF33;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #00E0FF; letter-spacing: 2px; margin: 0; font-size: 22px;">KENZO INFOSYSTEMS</h1>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 4px;">Enterprise Financial Control Center</p>
        </div>
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 20px; border-radius: 12px; text-align: center;">
          <h3 style="color: #ffffff; font-size: 16px; margin-top: 0;">${title}</h3>
          <p style="color: #d1d5db; font-size: 13px; line-height: 1.5;">
            Your single-use 6-digit verification code for Kenzo Kore Expense is:
          </p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #00E0FF; background: #090A0F; padding: 15px 25px; border-radius: 8px; display: inline-block; margin: 15px 0; border: 1px solid #00C8FF44;">
            ${otp}
          </div>
          <p style="color: #9ca3af; font-size: 11px; margin-bottom: 0;">
            This code is valid for <strong>10 minutes</strong> and can only be used once. If you did not initiate this request, please report it to your IT administrator immediately.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 11px;">
          Protected by Argon2id / Bcrypt & Google Cloud Identity Enterprise Federation.
        </div>
      </div>
    `;

    // 1. Primary Strategy: Resend HTTPS API (Port 443) - Clean, fast, unblocked on Render
    if (process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY) {
      const resendResult = await this.resendProvider.sendEmail({
        to: cleanEmail,
        subject,
        html,
      });

      if (resendResult.success) {
        this.logger.log(`Verification code successfully dispatched via Resend HTTPS to ${cleanEmail}`);
        return true;
      }

      this.logger.error(`Resend HTTPS delivery failed for ${cleanEmail}: ${resendResult.error}`);
      return false;
    }

    // 2. Secondary Local Development Strategy: SMTP (Only used if no Resend key is provided)
    this.logger.warn(`Dispatching via local SMTP fallback for ${cleanEmail}...`);
    const smtpResult = await this.smtpProvider.sendEmail({
      to: cleanEmail,
      subject,
      html,
    });

    if (smtpResult.success) {
      this.logger.log(`Verification code delivered via local SMTP fallback to ${cleanEmail}`);
      return true;
    }

    this.logger.error(`Local SMTP fallback delivery failed for ${cleanEmail}: ${smtpResult.error}`);
    return false;
  }
}
