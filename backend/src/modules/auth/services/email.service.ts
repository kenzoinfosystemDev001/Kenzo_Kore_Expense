import { Injectable, Logger } from '@nestjs/common';
import { ResendEmailProvider } from './providers/resend-email.provider';
import { SmtpEmailProvider } from './providers/smtp-email.provider';
import { SendOtpEmailOptions } from '../interfaces/email-provider.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly resendProvider: ResendEmailProvider,
    private readonly smtpProvider: SmtpEmailProvider,
  ) {
    const provider = (process.env.EMAIL_PROVIDER || 'resend').toLowerCase();
    if (provider === 'resend' || process.env.RESEND_API_KEY) {
      this.logger.log('Active Email Delivery Engine: Resend HTTPS REST API (Port 443)');
    } else {
      this.logger.warn('Active Email Delivery Engine: Local SMTP (Development Only)');
    }
  }

  /**
   * Primary OTP dispatch method:
   * Sends branded 6-digit challenge to recipient corporate inbox via HTTPS :443.
   * Returns true on SUCCESS, false on FAILURE.
   */
  async sendOtpEmail(options: SendOtpEmailOptions): Promise<boolean> {
    const { recipient, otp, purpose } = options;
    const cleanEmail = recipient.trim().toLowerCase();
    const title = purpose === 'ACTIVATION' ? 'Account Activation Verification Code' : 'Password Reset Verification Code';

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

    const providerType = (process.env.EMAIL_PROVIDER || 'resend').toLowerCase();

    // Production Path: Resend HTTPS API (Port 443)
    if (providerType === 'resend' || process.env.RESEND_API_KEY) {
      const resendResult = await this.resendProvider.sendEmail({
        to: cleanEmail,
        subject,
        html,
      });

      if (resendResult.success) {
        this.logger.log(`[RESEND_HTTPS_DELIVERY_SUCCESS] Dispatched verification code to ${cleanEmail}`);
        return true;
      }

      this.logger.error(`[RESEND_HTTPS_DELIVERY_FAILED] Resend API rejected email for ${cleanEmail}: ${resendResult.error}`);
      return false;
    }

    // Local Development Path: SMTP (Only used if EMAIL_PROVIDER=smtp is explicitly set)
    this.logger.warn(`Dispatching via local SMTP for ${cleanEmail}...`);
    const smtpResult = await this.smtpProvider.sendEmail({
      to: cleanEmail,
      subject,
      html,
    });

    if (smtpResult.success) {
      this.logger.log(`[SMTP_DELIVERY_SUCCESS] Dispatched verification code to ${cleanEmail}`);
      return true;
    }

    this.logger.error(`[SMTP_DELIVERY_FAILED] SMTP transmission failed for ${cleanEmail}: ${smtpResult.error}`);
    return false;
  }

  /**
   * Compatibility wrapper for existing service callers
   */
  async sendVerificationOtp(to: string, otp: string, purpose: 'ACTIVATION' | 'PASSWORD_RESET'): Promise<boolean> {
    return this.sendOtpEmail({ recipient: to, otp, purpose });
  }
}
