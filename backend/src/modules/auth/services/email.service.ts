import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as dns from 'dns';

export type SmtpErrorType = 'AUTH_ERROR' | 'NETWORK_TIMEOUT' | 'DNS_ERROR' | 'RATE_LIMIT' | 'UNKNOWN';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  /**
   * Initializes the SMTP transporter dynamically resolving IPv4 addresses
   */
  private async initTransporter(): Promise<boolean> {
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
      // Pre-resolve IPv4 addresses dynamically to eliminate IPv6 ENETUNREACH on Render/Cloud
      let resolvedHost = host;
      try {
        const ips = await dns.promises.resolve4(host);
        if (ips && ips.length > 0) {
          resolvedHost = ips[0]; // e.g. 142.250.185.108
        }
      } catch (dnsErr) {
        this.logger.warn(`Could not pre-resolve IPv4 for ${host}, using standard lookup.`);
      }

      this.transporter = nodemailer.createTransport({
        host: resolvedHost,
        port,
        secure: isSecure, // true for 465, false for 587
        requireTLS: !isSecure, // Enforce STARTTLS for port 587
        auth: { user, pass },
        tls: {
          servername: host, // Critical: Preserves SSL Certificate matching for smtp.gmail.com
          minVersion: 'TLSv1.2',
          rejectUnauthorized: false,
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
      } as any);

      this.logger.log(`SMTP Transport initialized: ${user.split('@')[0]}@*** (${host} [${resolvedHost}]:${port}, STARTTLS: ${!isSecure})`);
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
   * Dispatch via direct HTTPS REST API (Port 443 - Immune to cloud SMTP port blocks)
   */
  private async sendViaHttpsApi(to: string, subject: string, html: string): Promise<boolean> {
    const resendKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
    if (!resendKey) return false;

    try {
      this.logger.log(`Dispatching email to ${to} via Direct HTTPS REST API (Port 443)...`);
      const fromEmail = process.env.SMTP_FROM || 'Kenzo Kore Security <onboarding@resend.dev>';

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          html,
        }),
      });

      if (response.ok) {
        const data: any = await response.json();
        this.logger.log(`Email successfully delivered via HTTPS REST API to ${to} (ID: ${data.id})`);
        return true;
      } else {
        const errorText = await response.text();
        this.logger.warn(`HTTPS REST API dispatch failed: ${errorText}`);
      }
    } catch (err: any) {
      this.logger.error(`Error sending email via HTTPS REST API: ${err.message}`);
    }
    return false;
  }

  /**
   * Dispatches a single-use 6-digit verification code with controlled retries
   */
  async sendVerificationOtp(to: string, otp: string, purpose: 'ACTIVATION' | 'PASSWORD_RESET'): Promise<boolean> {
    const title = purpose === 'ACTIVATION' ? 'Account Activation Verification Code' : 'Password Reset Verification Code';
    const cleanEmail = to.trim().toLowerCase();

    const fromAddress = process.env.SMTP_FROM || `"Kenzo Kore Security" <${process.env.SMTP_USER || 'security@kenzoinfosystems.com'}>`;
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

    // 1. Primary Strategy: Try Direct HTTPS REST API if key is present
    const httpsSent = await this.sendViaHttpsApi(cleanEmail, subject, html);
    if (httpsSent) return true;

    // 2. Secondary Strategy: Direct Pre-Resolved IPv4 SMTP
    if (!this.transporter) {
      await this.initTransporter();
    }

    if (!this.transporter) {
      this.logger.error(`Cannot send OTP to ${cleanEmail}: No email transport available.`);
      return false;
    }

    const mailOptions = {
      from: fromAddress,
      to: cleanEmail,
      subject,
      html,
    };

    // Attempt 1: Pre-resolved IPv4 SMTP
    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email successfully delivered to ${cleanEmail} (MessageId: ${info.messageId})`);
      return true;
    } catch (primaryErr: any) {
      const errorType = this.classifyError(primaryErr);
      this.logger.warn(`Primary SMTP dispatch to ${cleanEmail} failed [${errorType}]: ${primaryErr.message}`);

      if (errorType === 'AUTH_ERROR') {
        this.logger.error('SMTP Authentication failure. Please check SMTP_USER and SMTP_PASS credentials.');
        return false;
      }

      // Attempt 2: Re-initialize and retry
      try {
        await new Promise(res => setTimeout(res, 1000));
        await this.initTransporter();
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
