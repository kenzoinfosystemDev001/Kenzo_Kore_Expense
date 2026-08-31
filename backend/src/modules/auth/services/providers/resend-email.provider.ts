import { Injectable, Logger } from '@nestjs/common';
import { IEmailProvider, SendEmailOptions, EmailDispatchResult } from '../../interfaces/email-provider.interface';

@Injectable()
export class ResendEmailProvider implements IEmailProvider {
  readonly providerName = 'RESEND_HTTPS';
  private readonly logger = new Logger(ResendEmailProvider.name);

  /**
   * Dispatches email via Resend HTTPS REST API (Port 443)
   * 100% immune to cloud SMTP port blocks (Render, AWS, DigitalOcean)
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailDispatchResult> {
    const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY is not configured in environment variables.');
      return { success: false, error: 'RESEND_API_KEY is missing' };
    }

    const fromAddress = options.from || process.env.RESEND_FROM || process.env.SMTP_FROM || 'Kenzo Kore Security <onboarding@resend.dev>';

    try {
      this.logger.log(`Dispatching email to ${options.to} via Resend HTTPS REST API (Port 443)...`);

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [options.to],
          subject: options.subject,
          html: options.html,
        }),
        signal: AbortSignal.timeout(12000), // 12-second HTTPS timeout
      });

      if (response.ok) {
        const data: any = await response.json();
        this.logger.log(`Email successfully delivered via Resend HTTPS to ${options.to} (MessageId: ${data?.id})`);
        return { success: true, messageId: data?.id };
      } else {
        const errorText = await response.text();
        this.logger.error(`Resend HTTPS API error (${response.status}): ${errorText}`);
        return { success: false, error: errorText };
      }
    } catch (err: any) {
      this.logger.error(`Resend HTTPS API connection failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}
