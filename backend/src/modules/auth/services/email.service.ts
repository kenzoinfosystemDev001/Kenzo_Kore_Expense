import { Injectable, Logger } from '@nestjs/common';
import { GmailApiEmailProvider } from './providers/gmail-api-email.provider';
import { SendOtpEmailOptions, EmailProviderHealth } from '../interfaces/email-provider.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly gmailProvider: GmailApiEmailProvider) {
    this.logger.log('[EmailService] Active Email Delivery Engine: Google Gmail API (HTTPS Port 443)');
  }

  /**
   * Primary OTP dispatch method:
   * Sends branded 6-digit challenge to recipient corporate inbox via official Google Gmail API.
   * Returns true on SUCCESS, false on FAILURE.
   */
  async sendOtpEmail(options: SendOtpEmailOptions): Promise<boolean> {
    const { recipient, otp, purpose } = options;
    const cleanEmail = recipient.trim().toLowerCase();
    const actionTitle =
      purpose === 'ACTIVATION'
        ? 'Account Activation Verification Code'
        : 'Password Reset Verification Code';

    const subject = 'Kenzo Kore Expense — Your Verification Code';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #030712; color: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid rgba(0, 200, 255, 0.2); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #00E0FF; letter-spacing: 2px; margin: 0; font-size: 24px; font-weight: 800;">KENZO INFOSYSTEMS</h1>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 4px; letter-spacing: 0.5px;">Enterprise Financial Control & Expense System</p>
        </div>
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); padding: 24px; border-radius: 12px; text-align: center;">
          <h3 style="color: #ffffff; font-size: 16px; margin-top: 0; font-weight: 600;">${actionTitle}</h3>
          <p style="color: #d1d5db; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            Your single-use 6-digit verification code for Kenzo Kore Expense is:
          </p>
          <div style="font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #00E0FF; background: #090A0F; padding: 16px 28px; border-radius: 8px; display: inline-block; margin: 12px 0; border: 1px solid rgba(0, 224, 255, 0.3);">
            ${otp}
          </div>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 16px; margin-bottom: 0; line-height: 1.5;">
            This security code is valid for <strong>10 minutes</strong> and can only be used once. If you did not initiate this request, please alert your IT Security Administrator immediately.
          </p>
        </div>
        <div style="text-align: center; margin-top: 24px; color: #6b7280; font-size: 11px; line-height: 1.5;">
          Secured by Google Workspace Domain-Wide Delegation & Google Cloud Identity Enterprise Federation.<br/>
          Kenzo Infosystems Private Limited &bull; Confidential &bull; All Rights Reserved
        </div>
      </div>
    `;

    // Dispatch via Google Gmail API (HTTPS :443)
    const result = await this.gmailProvider.sendEmail({
      to: cleanEmail,
      subject,
      html,
    });

    if (result.success) {
      return true;
    }

    // Single controlled retry for transient network issues
    if (result.statusCode && (result.statusCode === 429 || result.statusCode >= 500)) {
      this.logger.warn('[EmailService] Transient network/rate issue encountered. Retrying Gmail API dispatch once...');
      await new Promise((res) => setTimeout(res, 1000));
      const retryResult = await this.gmailProvider.sendEmail({
        to: cleanEmail,
        subject,
        html,
      });
      return retryResult.success;
    }

    return false;
  }

  /**
   * Compatibility wrapper for existing service callers
   */
  async sendVerificationOtp(to: string, otp: string, purpose: 'ACTIVATION' | 'PASSWORD_RESET'): Promise<boolean> {
    return this.sendOtpEmail({ recipient: to, otp, purpose });
  }

  /**
   * Safe Health Check for Email Subsystem
   */
  async checkHealth(): Promise<EmailProviderHealth> {
    return this.gmailProvider.checkHealth();
  }
}
