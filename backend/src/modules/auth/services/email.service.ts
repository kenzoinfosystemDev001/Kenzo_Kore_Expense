import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  idempotencyKey?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

export interface EmailProviderHealth {
  provider: string;
  status: 'CONFIGURED' | 'NOT_CONFIGURED';
  mode: 'HTTPS_REST' | 'SMTP';
  sender: string;
  healthy: boolean;
}

export interface SendOtpEmailOptions {
  recipient: string;
  otp: string;
  purpose: 'ACTIVATION' | 'PASSWORD_RESET';
}

export interface IEmailProvider {
  readonly providerName: string;
  sendEmail(options: SendEmailOptions): Promise<EmailDispatchResult>;
  checkHealth(): Promise<EmailProviderHealth>;
}

import { Resend } from 'resend';

@Injectable()
export class ResendEmailProvider implements IEmailProvider {
  readonly providerName = 'resend';
  private readonly logger = new Logger(ResendEmailProvider.name);

  async sendEmail(options: SendEmailOptions): Promise<EmailDispatchResult> {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      this.logger.error('[EmailService] OTP dispatch failed provider=resend errorCode=MISSING_API_KEY');
      return { success: false, error: 'RESEND_API_KEY is not configured', statusCode: 401 };
    }

    const fromAddress =
      options.from ||
      process.env.MAIL_FROM ||
      process.env.SMTP_FROM ||
      'Kenzo Kore Security <onboarding@resend.dev>';

    this.logger.log('[EmailService] Provider=resend');
    this.logger.log(`[EmailService] Resend SDK dispatch started -> ${options.to}`);

    try {
      const resend = new Resend(apiKey.trim());
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        headers: options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : undefined,
      });

      if (error) {
        this.logger.error(`[EmailService] OTP dispatch failed provider=resend error=${error.name} message=${error.message}`);
        return { success: false, error: error.message, statusCode: 400 };
      }

      this.logger.log(`[EmailService] Email accepted by Resend (MessageId: ${data?.id || 'OK'})`);
      return { success: true, messageId: data?.id, statusCode: 200 };
    } catch (err: any) {
      this.logger.error(`[EmailService] Resend SDK unexpected error: ${err.message}`);
      return { success: false, error: err.message, statusCode: 500 };
    }
  }

  async checkHealth(): Promise<EmailProviderHealth> {
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress =
      process.env.MAIL_FROM || process.env.RESEND_FROM || 'Kenzo Kore Security <onboarding@resend.dev>';

    return {
      provider: 'Resend',
      status: apiKey ? 'CONFIGURED' : 'NOT_CONFIGURED',
      mode: 'HTTPS_REST',
      sender: fromAddress,
      healthy: !!apiKey,
    };
  }
}

@Injectable()
export class SmtpEmailProvider implements IEmailProvider {
  readonly providerName = 'smtp';
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
      this.transporter = null;
      return false;
    }

    const pass = rawPass.replace(/\s+/g, '');
    const isSecure = port === 465;

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: isSecure,
        auth: { user, pass },
        tls: {
          minVersion: 'TLSv1.2',
          rejectUnauthorized: false,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      } as any);
      return true;
    } catch {
      this.transporter = null;
      return false;
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailDispatchResult> {
    if (!this.transporter && !this.initTransporter()) {
      return { success: false, error: 'SMTP transporter not configured', statusCode: 500 };
    }

    const fromAddress =
      options.from || process.env.SMTP_FROM || `"Kenzo Kore Security" <${process.env.SMTP_USER}>`;

    try {
      const info = await this.transporter!.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      return { success: true, messageId: info.messageId, statusCode: 200 };
    } catch (err: any) {
      return { success: false, error: err.message, statusCode: 500 };
    }
  }

  async checkHealth(): Promise<EmailProviderHealth> {
    const isConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    return {
      provider: 'SMTP (Local)',
      status: isConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED',
      mode: 'SMTP',
      sender: process.env.SMTP_FROM || 'local@kenzoinfosystems.com',
      healthy: isConfigured,
    };
  }
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly resendProvider: ResendEmailProvider,
    private readonly smtpProvider: SmtpEmailProvider,
  ) {
    const provider = (process.env.EMAIL_PROVIDER || 'resend').toLowerCase();
    if (provider === 'resend' || process.env.RESEND_API_KEY) {
      this.logger.log('[EmailService] Active Email Delivery Engine: Resend HTTPS REST API (Port 443)');
    } else {
      this.logger.warn('[EmailService] Active Email Delivery Engine: Local SMTP (Development Only)');
    }
  }

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

    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${cleanEmail}:${purpose}:${otp}`)
      .digest('hex');

    const providerType = (process.env.EMAIL_PROVIDER || 'resend').toLowerCase();

    if (providerType === 'resend' || process.env.RESEND_API_KEY) {
      const resendResult = await this.resendProvider.sendEmail({
        to: cleanEmail,
        subject,
        html,
        idempotencyKey,
      });

      if (resendResult.success) {
        return true;
      }

      if (resendResult.statusCode && resendResult.statusCode >= 400 && resendResult.statusCode < 500) {
        this.logger.error(`[EmailService] Non-retryable client error (${resendResult.statusCode}). Aborting dispatch.`);
        return false;
      }

      this.logger.warn(`[EmailService] Transient issue encountered. Executing single controlled retry...`);
      await new Promise((res) => setTimeout(res, 1000));

      const retryResult = await this.resendProvider.sendEmail({
        to: cleanEmail,
        subject,
        html,
        idempotencyKey,
      });

      return retryResult.success;
    }

    this.logger.warn(`[EmailService] Dispatching via local SMTP fallback for recipient=${cleanEmail.split('@')[0]}@***`);
    const smtpResult = await this.smtpProvider.sendEmail({
      to: cleanEmail,
      subject,
      html,
    });

    return smtpResult.success;
  }

  async sendVerificationOtp(to: string, otp: string, purpose: 'ACTIVATION' | 'PASSWORD_RESET'): Promise<boolean> {
    return this.sendOtpEmail({ recipient: to, otp, purpose });
  }

  async checkHealth(): Promise<EmailProviderHealth> {
    const providerType = (process.env.EMAIL_PROVIDER || 'resend').toLowerCase();
    if (providerType === 'resend' || process.env.RESEND_API_KEY) {
      return this.resendProvider.checkHealth();
    }
    return this.smtpProvider.checkHealth();
  }
}
