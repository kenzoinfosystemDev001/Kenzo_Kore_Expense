export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IEmailProvider {
  readonly providerName: string;
  sendEmail(options: SendEmailOptions): Promise<EmailDispatchResult>;
}

export interface SendOtpEmailOptions {
  recipient: string;
  otp: string;
  purpose: 'ACTIVATION' | 'PASSWORD_RESET';
}
