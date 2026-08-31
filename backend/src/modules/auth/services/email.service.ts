import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as dns from 'dns';

// Force strict IPv4 resolution dynamically from DNS (no hardcoded IPs, no IPv6 ENETUNREACH)
const ipv4OnlyLookup = (hostname: string, options: any, callback: any) => {
  return dns.lookup(hostname, { family: 4 }, callback);
};

export type SmtpErrorType = 'AUTH_ERROR' | 'NETWORK_TIMEOUT' | 'DNS_ERROR' | 'RATE_LIMIT' | 'UNKNOWN';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter(): boolean {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const rawPass = process.env.SMTP_PASS;

    if (!user || !rawPass) {
      this.logger.warn('SMTP credentials (SMTP_USER / SMTP_PASS) not configured in environment.');
      this.transporter = null;
      return false;
    }

    const pass = rawPass.replace(/\s+/g, '');
    const isSecure = port === 465;

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: isSecure, // true for 465 (SSL), false for 587 (STARTTLS)
        requireTLS: !isSecure, // Enforce STARTTLS for port 587
        lookup: ipv4OnlyLookup, // Dynamically resolve standard DNS to IPv4 only
        auth: { user, pass },
        tls: {
          minVersion: 'TLSv1.2',
          rejectUnauthorized: true,
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
      } as any);

      this.logger.log(`SMTP Transport initialized: ${user.split('@')[0]}@*** (${host}:${port}, STARTTLS: ${!isSecure})`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to initialize SMTP transport: ${err.message}`);
      this.transporter = null;
      return false;
    }
  }

  private classifyError(err: any): SmtpErrorType {
    const code = err?.code || '';
    const message = (err?.message || '').toLowerCase();
    const responseCode = err?.responseCode || 0;

    if (code === 'EAUTH' || responseCode === 535 || message.includes('authentication') || message.includes('invalid credentials')) {
      return 'AUTH_ERROR';
    }
    if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT' || message.includes('timeout') || message.includes('enetunreach')) {
      return 'NETWORK_TIMEOUT';
    }
    if (code === 'EDNS' || code === 'ENOTFOUND' || message.includes('getaddrinfo')) {
      return 'DNS_ERROR';
    }
    if (responseCode === 421 || responseCode === 450 || responseCode === 451 || message.includes('rate limit')) {
      return 'RATE_LIMIT';
    }
    return 'UNKNOWN';
  }

  /**
   * Verify SMTP connection health
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter && !this.initTransporter()) {
      return false;
    }
    try {
      await this.transporter!.verify();
      this.logger.log('SMTP connection verification succeeded.');
      return true;
    } catch (err: any) {
      const errorType = this.classifyError(err);
      this.logger.error(`SMTP connection verification failed [${errorType}]: ${err.message}`);
      return false;
    }
  }

  /**
   * Dispatches a single-use 6-digit verification code with controlled retries
   */
  async sendVerificationOtp(to: string, otp: string, purpose: 'ACTIVATION' | 'PASSWORD_RESET'): Promise<boolean> {
    const title = purpose === 'ACTIVATION' ? 'Account Activation Verification Code' : 'Password Reset Verification Code';
    const cleanEmail = to.trim().toLowerCase();

    if (!this.transporter && !this.initTransporter()) {
      this.logger.error(`Cannot send OTP to ${cleanEmail}: SMTP transporter is not configured.`);
      return false;
    }

    const fromAddress = process.env.SMTP_FROM || `"Kenzo Kore Security" <${process.env.SMTP_USER}>`;

    const mailOptions = {
      from: fromAddress,
      to: cleanEmail,
      subject: `[Kenzo Kore Expense] ${title}`,
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

    // Attempt 1
    try {
      const info = await this.transporter!.sendMail(mailOptions);
      this.logger.log(`Verification email successfully delivered to ${cleanEmail} (MessageId: ${info.messageId})`);
      return true;
    } catch (primaryErr: any) {
      const errorType = this.classifyError(primaryErr);
      this.logger.warn(`Primary SMTP dispatch to ${cleanEmail} failed [${errorType}]: ${primaryErr.message}`);

      // If permanent auth error, do not retry
      if (errorType === 'AUTH_ERROR') {
        this.logger.error('SMTP Authentication failure. Please verify SMTP_USER and SMTP_PASS credentials.');
        return false;
      }

      // Retry Attempt 2 with fresh transporter for transient network issues
      try {
        await new Promise(res => setTimeout(res, 1000));
        this.initTransporter();
        const retryInfo = await this.transporter!.sendMail(mailOptions);
        this.logger.log(`Retry verification email successfully delivered to ${cleanEmail} (MessageId: ${retryInfo.messageId})`);
        return true;
      } catch (retryErr: any) {
        const retryErrorType = this.classifyError(retryErr);
        this.logger.error(`Retry SMTP dispatch to ${cleanEmail} failed [${retryErrorType}]: ${retryErr.message}`);
        return false;
      }
    }
  }
}
