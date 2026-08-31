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
  mode: 'GMAIL_REST_HTTPS' | 'HTTPS_REST';
  sender: string;
  impersonatedUser?: string;
  healthy: boolean;
}

export interface IEmailProvider {
  readonly providerName: string;
  sendEmail(options: SendEmailOptions): Promise<EmailDispatchResult>;
  checkHealth(): Promise<EmailProviderHealth>;
}

export interface SendOtpEmailOptions {
  recipient: string;
  otp: string;
  purpose: 'ACTIVATION' | 'PASSWORD_RESET';
}
