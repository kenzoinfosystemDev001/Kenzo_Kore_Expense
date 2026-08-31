import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import {
  IEmailProvider,
  SendEmailOptions,
  EmailDispatchResult,
  EmailProviderHealth,
} from '../../interfaces/email-provider.interface';

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
