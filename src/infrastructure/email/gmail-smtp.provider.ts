import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ProcessException } from "../../common/exceptions";
import {
  EMAIL_CONFIG_KEYS,
  EMAIL_DEFAULTS,
  EMAIL_ERROR_MESSAGES,
  GMAIL_SMTP_CONFIG,
} from "./email.constants";
import { EmailMessage, SmtpTransport } from "./email.types";
import { GmailSmtpTransportFactory } from "./gmail-smtp-transport.factory";
import { getOptionalEmailConfig } from "./utils/email-config.util";
import {
  getSmtpErrorMetadata,
  isRetryableSmtpError,
} from "./utils/smtp-error.util";

@Injectable()
export class GmailSmtpProvider {
  private readonly logger = new Logger(GmailSmtpProvider.name);
  private transporter: SmtpTransport | null = null;
  private fromAddress = "";

  constructor(
    private readonly configService: ConfigService,
    private readonly transportFactory: GmailSmtpTransportFactory,
  ) {}

  /**
   * A credencial é lida no primeiro envio, não no construtor.
   *
   * Antes o provider montava o transporte ao ser instanciado: um ambiente sem
   * `GMAIL_SMTP_USER` — o caso de `env/prod.env` — **derrubava o boot da API
   * inteira**, em vez de apenas não enviar e-mail.
   */
  private getTransporter(): SmtpTransport {
    if (this.transporter) return this.transporter;

    const user = getOptionalEmailConfig(
      this.configService,
      EMAIL_CONFIG_KEYS.GMAIL_USER,
    );
    const appPassword = getOptionalEmailConfig(
      this.configService,
      EMAIL_CONFIG_KEYS.GMAIL_APP_PASSWORD,
    );

    if (!user || !appPassword) {
      const missing = !user
        ? EMAIL_CONFIG_KEYS.GMAIL_USER
        : EMAIL_CONFIG_KEYS.GMAIL_APP_PASSWORD;
      this.logger.error(EMAIL_ERROR_MESSAGES.REQUIRED_CONFIG(missing));
      throw new ProcessException(EMAIL_ERROR_MESSAGES.REQUIRED_CONFIG(missing));
    }

    this.fromAddress = user;
    this.transporter = this.transportFactory.create({
      host: GMAIL_SMTP_CONFIG.HOST,
      port: GMAIL_SMTP_CONFIG.PORT,
      secure: GMAIL_SMTP_CONFIG.SECURE,
      auth: { user, pass: appPassword },
      connectionTimeout: GMAIL_SMTP_CONFIG.CONNECTION_TIMEOUT_MS,
      greetingTimeout: GMAIL_SMTP_CONFIG.GREETING_TIMEOUT_MS,
      socketTimeout: GMAIL_SMTP_CONFIG.SOCKET_TIMEOUT_MS,
    });
    return this.transporter;
  }

  /** `true` quando há credencial configurada para enviar. */
  isConfigured(): boolean {
    return (
      !!getOptionalEmailConfig(
        this.configService,
        EMAIL_CONFIG_KEYS.GMAIL_USER,
      ) &&
      !!getOptionalEmailConfig(
        this.configService,
        EMAIL_CONFIG_KEYS.GMAIL_APP_PASSWORD,
      )
    );
  }

  private fromName(): string {
    return (
      getOptionalEmailConfig(this.configService, EMAIL_CONFIG_KEYS.FROM_NAME) ||
      EMAIL_DEFAULTS.FROM_NAME
    );
  }

  async send(message: EmailMessage): Promise<void> {
    const transporter = this.getTransporter();

    for (
      let attempt = 1;
      attempt <= GMAIL_SMTP_CONFIG.MAX_ATTEMPTS;
      attempt += 1
    ) {
      try {
        await transporter.sendMail({
          from: {
            name: this.fromName(),
            address: this.fromAddress,
          },
          to: message.to,
          subject: message.subject,
          text: message.text,
          html: message.html,
        });
        this.logger.log("E-mail enviado com sucesso pelo SMTP do Gmail.");
        return;
      } catch (error: unknown) {
        const canRetry =
          attempt < GMAIL_SMTP_CONFIG.MAX_ATTEMPTS &&
          isRetryableSmtpError(error);

        if (!canRetry) {
          this.logger.error({
            message: "Falha no envio pelo SMTP do Gmail.",
            ...getSmtpErrorMetadata(error),
          });
          throw new ProcessException(EMAIL_ERROR_MESSAGES.DELIVERY_FAILED);
        }

        this.logger.warn({
          message: "Falha temporária no SMTP do Gmail; o envio será repetido.",
          attempt,
          ...getSmtpErrorMetadata(error),
        });
        await this.delay(GMAIL_SMTP_CONFIG.RETRY_DELAY_MS * attempt);
      }
    }
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}
