import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const user = process.env.SMTP_USER || process.env.GMAIL_USER || 'jitender.saini@kenzoinfosystems.com';
    const pass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || 'keinawhijkwkhcjz').replace(/\s+/g, '');

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // SSL for 465
        family: 4, // Force IPv4 to prevent ENETUNREACH on Render/Cloud containers
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
        },
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 30000,
      } as any);
      this.logger.log(`Direct SSL Cloud SMTP Transport configured for: ${user} (${host}:${port}, IPv4 forced)`);
    } else {
      this.logger.warn(`SMTP credentials not configured. Verification codes will be recorded to server logs.`);
    }
  }

  async sendVerificationOtp(to: string, otp: string, purpose: 'ACTIVATION' | 'PASSWORD_RESET'): Promise<boolean> {
    const title = purpose === 'ACTIVATION' ? 'Account Activation Verification Code' : 'Password Reset Verification Code';
    const cleanEmail = to.trim().toLowerCase();

    if (!this.transporter) {
      this.initTransporter();
    }

    if (this.transporter) {
      const mailOptions = {
        from: process.env.SMTP_FROM || `"Kenzo Kore Security" <jitender.saini@kenzoinfosystems.com>`,
        to: cleanEmail,
        subject: `[Kenzo Kore Expense] ${title}: ${otp}`,
        html: `
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
        `,
      };

      try {
        const info = await this.transporter.sendMail(mailOptions);
        this.logger.log(`Live verification email successfully dispatched to ${cleanEmail} (Message ID: ${info.messageId})`);
        return true;
      } catch (err) {
        this.logger.warn(`Primary SMTP attempt failed (${err.message}). Retrying direct connection...`);
        try {
          this.initTransporter();
          const retryInfo = await this.transporter.sendMail(mailOptions);
          this.logger.log(`Retry verification email successfully dispatched to ${cleanEmail} (Message ID: ${retryInfo.messageId})`);
          return true;
        } catch (retryErr) {
          this.logger.error(`Failed to dispatch SMTP email to ${cleanEmail} after retry:`, retryErr);
        }
      }
    }

    this.logger.log(`[DISPATCH] Generated 6-digit OTP code for ${cleanEmail}: ${otp}`);
    return false;
  }
}
