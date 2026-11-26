export interface EmailMessage {
  readonly to: string | string[];
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
}

export interface GmailSmtpTransportOptions {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly auth: {
    readonly user: string;
    readonly pass: string;
  };
  readonly connectionTimeout: number;
  readonly greetingTimeout: number;
  readonly socketTimeout: number;
}

export interface SmtpMailOptions {
  readonly from: {
    readonly name: string;
    readonly address: string;
  };
  readonly to: string | string[];
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
}

export interface SmtpTransport {
  sendMail(message: SmtpMailOptions): Promise<unknown>;
}

export interface SmtpErrorMetadata {
  readonly name: string;
  readonly code?: string;
  readonly responseCode?: number;
  readonly command?: string;
}
