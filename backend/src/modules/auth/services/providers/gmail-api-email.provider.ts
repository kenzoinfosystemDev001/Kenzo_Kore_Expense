import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import {
  IEmailProvider,
  SendEmailOptions,
  EmailDispatchResult,
  EmailProviderHealth,
} from '../../interfaces/email-provider.interface';

@Injectable()
export class GmailApiEmailProvider implements IEmailProvider {
  readonly providerName = 'google_gmail_api';
  private readonly logger = new Logger(GmailApiEmailProvider.name);

  /**
   * Normalize private key format, resolving literal \n or escaped \\n characters cleanly
   */
  private getNormalizedPrivateKey(): string | null {
    const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    if (!rawKey) return null;

    // Replace escaped newlines with actual newline characters
    return rawKey.replace(/\\n/g, '\n').trim();
  }

  /**
   * Build authenticated Google Gmail API client using Service Account with Domain-Wide Delegation
   */
  private getGmailClient() {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = this.getNormalizedPrivateKey();
    const impersonateUser =
      process.env.GOOGLE_GMAIL_IMPERSONATE_USER ||
      process.env.EMAIL_FROM_ADDRESS ||
      'notifications@kenzoinfosystems.com';

    if (!clientEmail || !privateKey) {
      return null;
    }

    const rawScopes = process.env.GOOGLE_GMAIL_SCOPES || 'https://www.googleapis.com/auth/gmail.send';
    const scopes = rawScopes.split(',').map((s) => s.trim());

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes,
      subject: impersonateUser, // Domain-Wide Delegation: impersonates company sender mailbox
    });

    return google.gmail({ version: 'v1', auth });
  }

  /**
   * Dispatches transactional email via official Google Gmail API (HTTPS Port 443)
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailDispatchResult> {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = this.getNormalizedPrivateKey();
    const impersonateUser =
      process.env.GOOGLE_GMAIL_IMPERSONATE_USER ||
      process.env.EMAIL_FROM_ADDRESS ||
      'notifications@kenzoinfosystems.com';

    if (!clientEmail || !privateKey) {
      this.logger.error('[GoogleGmailProvider] Gmail API dispatch failed status=MISSING_CREDENTIALS reason=GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY missing');
      return {
        success: false,
        error: 'Google Service Account credentials not configured',
        statusCode: 401,
      };
    }

    const fromName = process.env.EMAIL_FROM_NAME || 'Kenzo Kore Security';
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || impersonateUser;

    this.logger.log('[GoogleGmailProvider] Gmail API authentication successful');
    this.logger.log(`[GoogleGmailProvider] OTP email dispatch started for recipient=${options.to.split('@')[0]}@***`);

    try {
      const gmail = this.getGmailClient();
      if (!gmail) {
        throw new Error('Failed to initialize Google Gmail API client');
      }

      // 1. Construct valid RFC 2822 / MIME message
      const utf8Subject = `=?utf-8?B?${Buffer.from(options.subject).toString('base64')}?=`;
      const mimeLines = [
        `From: ${fromName} <${fromAddress}>`,
        `To: ${options.to}`,
        `Subject: ${utf8Subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=utf-8`,
        `Content-Transfer-Encoding: base64`,
        '',
        Buffer.from(options.html).toString('base64'),
      ];
      const mimeMessage = mimeLines.join('\r\n');

      // 2. Base64URL encode MIME message as required by Gmail API
      const rawBase64Url = Buffer.from(mimeMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // 3. Send message via Gmail API messages.send (HTTPS :443)
      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawBase64Url,
        },
      });

      if (res.status === 200 && res.data && res.data.id) {
        this.logger.log(`[GoogleGmailProvider] Gmail API accepted message (MessageId: ${res.data.id})`);
        return {
          success: true,
          messageId: res.data.id,
          statusCode: 200,
        };
      } else {
        const status = res.status || 500;
        this.logger.error(`[GoogleGmailProvider] Gmail API dispatch failed status=${status} reason=Non-200 API response`);
        return {
          success: false,
          error: `Gmail API responded with status ${status}`,
          statusCode: status,
        };
      }
    } catch (err: any) {
      const status = err?.code || err?.status || 500;
      const message = err?.message || 'Unknown Gmail API Error';
      let safeReason = 'API_ERROR';

      if (message.includes('unauthorized_client') || message.includes('invalid_grant')) {
        safeReason = 'AUTH_DELEGATION_ERROR (Verify Domain-Wide Delegation client ID and scopes in Google Admin)';
      } else if (message.includes('access_denied') || status === 403) {
        safeReason = 'PERMISSION_DENIED (Check gmail.send scope and sender mailbox authorization)';
      } else if (message.includes('rateLimitExceeded') || status === 429) {
        safeReason = 'RATE_LIMIT_EXCEEDED';
      } else if (message.includes('ETIMEDOUT') || message.includes('ECONNRESET')) {
        safeReason = 'NETWORK_TIMEOUT';
      }

      this.logger.error(`[GoogleGmailProvider] Gmail API dispatch failed status=${status} reason=${safeReason}`);
      return {
        success: false,
        error: safeReason,
        statusCode: typeof status === 'number' ? status : 500,
      };
    }
  }

  /**
   * Safe Health Check for Google Gmail API Subsystem
   */
  async checkHealth(): Promise<EmailProviderHealth> {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = this.getNormalizedPrivateKey();
    const impersonateUser =
      process.env.GOOGLE_GMAIL_IMPERSONATE_USER ||
      process.env.EMAIL_FROM_ADDRESS ||
      'notifications@kenzoinfosystems.com';
    const fromName = process.env.EMAIL_FROM_NAME || 'Kenzo Kore Security';

    const isConfigured = !!(clientEmail && privateKey);

    return {
      provider: 'Google Gmail API',
      status: isConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED',
      mode: 'GMAIL_REST_HTTPS',
      sender: `${fromName} <${impersonateUser}>`,
      impersonatedUser: impersonateUser,
      healthy: isConfigured,
    };
  }
}
