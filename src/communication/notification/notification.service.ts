import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../infrastructure/email/email.service';
import { TwilioService } from '../../infrastructure/twilio/twilio.service';
import { ContactEntity } from '../contact/contact.entity';
import {
  EventAction,
  EventNotificationLogs,
  EventNotificationMessages,
} from '../../content/event/constants/event-notification.constants';
import {
  EventEmailData,
  EventEmailTemplate,
} from './templates/event-email.template';
import { ContactEmailTemplate } from './templates/contact-email.template';
import { BaseEmailTemplate } from './templates/base-email.template';
import {
  NOTIFICATION_CONFIG,
  NotificationLogs,
} from './constants/notification.constants';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly twilioService: TwilioService,
    private readonly configService: ConfigService,
  ) {}

  async sendContactNotification(
    contact: ContactEntity,
    recipientEmails?: string[],
  ): Promise<void> {
    await this.sendContactEmails(contact, recipientEmails);
    await this.sendContactWhatsApp(contact);
  }

  async sendPasswordResetEmail(
    userEmail: string,
    userName: string,
    resetToken: string,
  ): Promise<void> {
    const baseUrl = this.getBaseUrl();
    const resetLink = `${baseUrl}/recuperar-senha/${resetToken}`;

    const emailHtml = BaseEmailTemplate.generate(
      'Recuperação de Senha',
      userName,
      `<p>Recebemos uma solicitação para redefinir sua senha.</p>
       <p>Clique no botão abaixo para criar uma nova senha:</p>
       <div style="text-align: center; margin: 30px 0;">
         <a href="${resetLink}" class="button" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Redefinir Senha</a>
       </div>
       <p style="font-size: 14px; color: #666;">Ou copie e cole o link abaixo no seu navegador:</p>
       <p style="font-size: 12px; color: #4F46E5; word-break: break-all;">${resetLink}</p>
       <p>Este link é válido por 30 minutos.</p>`,
    );

    const textBody = `Olá ${userName},\n\nRecebemos uma solicitação para redefinir sua senha.\nClique no link abaixo: \n${resetLink}`;

    try {
      await this.emailService.dispatch({
        to: userEmail,
        subject: 'Recuperação de Senha - Orfanatos NIB',
        text: textBody,
        html: emailHtml,
      });
      this.logger.log(NotificationLogs.PASSWORD_RESET_SENT);
    } catch (error: unknown) {
      this.logger.error(NotificationLogs.PASSWORD_RESET_ERROR);
      throw error;
    }
  }

  async sendPasswordChangedEmail(
    userEmail: string,
    userName: string,
  ): Promise<void> {
    const baseUrl = this.getBaseUrl();

    const emailHtml = BaseEmailTemplate.generate(
      'Senha Alterada',
      userName,
      `<p>Sua senha foi alterada com sucesso.</p>
       <p>Agora você pode acessar sua conta com a nova senha.</p>
       <div style="text-align: center; margin: 30px 0;">
         <a href="${baseUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Acessar Plataforma</a>
       </div>`,
    );

    const textBody = `Olá ${userName},\n\nSua senha foi alterada com sucesso.`;

    try {
      await this.emailService.dispatch({
        to: userEmail,
        subject: 'Senha Alterada com Sucesso - Orfanatos NIB',
        text: textBody,
        html: emailHtml,
      });
      this.logger.log(NotificationLogs.PASSWORD_CHANGED_SENT);
    } catch (error: unknown) {
      this.logger.error(NotificationLogs.PASSWORD_CHANGED_ERROR);
      throw error;
    }
  }

  async sendEventNotification(
    event: EventEmailData,
    action: EventAction,
    recipientEmails: string[],
  ): Promise<void> {
    if (recipientEmails.length === 0) {
      this.logger.warn(EventNotificationLogs.NO_RECIPIENTS());
      return;
    }

    const messages =
      EventNotificationMessages[
        action.toUpperCase() as keyof typeof EventNotificationMessages
      ];
    const htmlBody = EventEmailTemplate.generate(event, action);
    const textBody = `O evento "${event.title}" ${messages.action}.\n\nData: ${event.date}${event.location ? `\nLocal: ${event.location}` : ''}${event.description ? `\nDescricao: ${event.description}` : ''}`;

    for (let index = 0; index < recipientEmails.length; index += 1) {
      try {
        await this.emailService.dispatch({
          to: recipientEmails[index],
          subject: messages.subject,
          text: textBody,
          html: htmlBody,
        });
        this.logger.log(EventNotificationLogs.EMAIL_SENT(action));
      } catch (error: unknown) {
        this.logger.error(EventNotificationLogs.EMAIL_ERROR(action));
      }

      if (index < recipientEmails.length - 1) {
        await this.delay(NOTIFICATION_CONFIG.EMAIL_SEND_INTERVAL_MS);
      }
    }
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  private async sendContactEmails(
    contact: ContactEntity,
    recipientEmails?: string[],
  ): Promise<void> {
    const emails = recipientEmails ?? [];

    if (emails.length === 0) {
      this.logger.warn(NotificationLogs.CONTACT_EMAIL_RECIPIENTS_MISSING);
      return;
    }

    const htmlBody = ContactEmailTemplate.generate(contact);
    const subject = 'Novo Contato - Orfanatos NIB';

    for (const email of emails) {
      try {
        await this.emailService.dispatch({
          to: email,
          subject,
          text: '',
          html: htmlBody,
        });
        this.logger.log(NotificationLogs.CONTACT_EMAIL_SENT);
      } catch (error: unknown) {
        this.logger.error(NotificationLogs.CONTACT_EMAIL_ERROR);
      }
    }
  }

  private async sendContactWhatsApp(contact: ContactEntity): Promise<void> {
    const whatsappFrom = this.configService.get<string>('TWILIO_WHATSAPP_FROM');
    const whatsappTo = this.configService.get<string>('TWILIO_WHATSAPP_TO');

    if (!whatsappFrom || !whatsappTo) {
      this.logger.warn(NotificationLogs.WHATSAPP_CONFIG_MISSING);
      return;
    }

    const message = this.generateWhatsappMessage(contact);

    try {
      await this.twilioService.sendWhatsAppMessage(
        whatsappFrom,
        whatsappTo,
        message,
      );
      this.logger.log(NotificationLogs.CONTACT_WHATSAPP_SENT);
    } catch (error: unknown) {
      this.logger.error(NotificationLogs.CONTACT_WHATSAPP_ERROR);
    }
  }

  private generateWhatsappMessage(contact: ContactEntity): string {
    return `
📥 *Novo contato recebido via site Orfanatos NIB!*

👤 *Nome:* ${contact.name}
📧 *E-mail:* ${contact.email}
📱 *Telefone:* ${contact.phone}

💬 *Mensagem:*
${contact.message}
    `.trim();
  }

  private getBaseUrl(): string {
    const environment =
      this.configService.get<string>('ENVIRONMENT') ??
      NOTIFICATION_CONFIG.LOCAL_ENVIRONMENT;

    if (NOTIFICATION_CONFIG.PRODUCTION_ENVIRONMENTS.includes(environment)) {
      return NOTIFICATION_CONFIG.PRODUCTION_BASE_URL;
    }

    if (environment === NOTIFICATION_CONFIG.STAGING_ENVIRONMENT) {
      return NOTIFICATION_CONFIG.STAGING_BASE_URL;
    }

    return NOTIFICATION_CONFIG.LOCAL_BASE_URL;
  }
}
