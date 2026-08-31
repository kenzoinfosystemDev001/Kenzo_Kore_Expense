import { Injectable, Logger } from '@nestjs/common';
import {
  IEmailProvider,
  SendEmailOptions,
  EmailDispatchResult,
  EmailProviderHealth,
} from '../../interfaces/email-provider.interface';

@Injectable()
export class ResendEmailProvider implements IEmailProvider {
  readonly providerName = 'resend';
  private readonly logger = new Logger(ResendEmailProvider.name);

  /**
   * Dispatches email via Resend HTTPS REST API (Port 443)
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailDispatchResult> {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      this.logger.error('[EmailService] OTP dispatch failed provider=resend errorCode=MISSING_API_KEY');
      return { success: false, error: 'RESEND_API_KEY is not configured', statusCode: 401 };
    }

    const fromAddress =
      options.from ||
      process.env.EMAIL_FROM ||
      process.env.RESEND_FROM ||
      'Kenzo Kore Security <onboarding@resend.dev>';

    this.logger.log('[EmailService] Provider=resend');
    this.logger.log('[EmailService] HTTPS email dispatch started');

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
    };

    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          from: fromAddress,
          to: [options.to],
          subject: options.subject,
          html: options.html,
        }),
        signal: AbortSignal.timeout(12000), // 12s timeout
      });

      if (response.ok) {
        const data: any = await response.json();
        this.logger.log(`[EmailService] Email accepted by provider (MessageId: ${data?.id || 'OK'})`);
        return { success: true, messageId: data?.id, statusCode: response.status };
      } else {
        const errorText = await response.text().catch(() => 'Unknown API Error');
        const safeCode = `HTTP_${response.status}`;
        this.logger.error(`[EmailService] OTP dispatch failed provider=resend errorCode=${safeCode}`);
        return { success: false, error: errorText, statusCode: response.status };
      }
    } catch (err: any) {
      const isTimeout = err?.name === 'TimeoutError' || err?.message?.toLowerCase().includes('timeout');
      const safeCode = isTimeout ? 'NETWORK_TIMEOUT' : 'NETWORK_ERROR';
      this.logger.error(`[EmailService] OTP dispatch failed provider=resend errorCode=${safeCode}`);
      return { success: false, error: safeCode, statusCode: 504 };
    }
  }

  /**
   * Safe Health Check (Never exposes credentials, never sends test emails)
   */
  async checkHealth(): Promise<EmailProviderHealth> {
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress =
      process.env.EMAIL_FROM || process.env.RESEND_FROM || 'Kenzo Kore Security <onboarding@resend.dev>';

    return {
      provider: 'Resend',
      status: apiKey ? 'CONFIGURED' : 'NOT_CONFIGURED',
      mode: 'HTTPS_REST',
      sender: fromAddress,
      healthy: !!apiKey,
    };
  }
}
