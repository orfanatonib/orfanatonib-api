import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsSESService } from 'src/infrastructure/aws/aws-ses.service';
import { SesIdentityService } from 'src/infrastructure/aws/ses-identity.service';
import { TwilioService } from 'src/infrastructure/twilio/twilio.service';
import { ContactEntity } from '../contact/contact.entity';
import { ContactEmailTemplate } from './templates/contact-email.template';
import { BaseEmailTemplate } from './templates/base-email.template';
import { NotificationLogs } from './constants/notification.constants';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly sesIdentityService: SesIdentityService,
        private readonly twilioService: TwilioService,
        private readonly configService: ConfigService,
    ) { }

    async sendContactNotification(contact: ContactEntity, recipientEmails?: string[]): Promise<void> {
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
       <p>Este link é válido por 30 minutos.</p>`
        );

        const textBody = `Olá ${userName},\n\nRecebemos uma solicitação para redefinir sua senha.\nClique no link abaixo: \n${resetLink}`;

        try {
            await this.awsSESService.sendEmail(
                userEmail,
                'Recuperação de Senha - Orfanatos NIB',
                textBody,
                emailHtml,
            );
            this.logger.log(NotificationLogs.PASSWORD_RESET_SENT(userEmail));
        } catch (error) {
            this.logger.error(NotificationLogs.PASSWORD_RESET_ERROR(error.message));
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
       </div>`
        );

        const textBody = `Olá ${userName},\n\nSua senha foi alterada com sucesso.`;

        try {
            await this.awsSESService.sendEmail(
                userEmail,
                'Senha Alterada com Sucesso - Orfanatos NIB',
                textBody,
                emailHtml,
            );
            this.logger.log(NotificationLogs.PASSWORD_CHANGED_SENT(userEmail));
        } catch (error) {
            this.logger.error(NotificationLogs.PASSWORD_CHANGED_ERROR(error.message));
            throw error;
        }
    }

    private async sendContactEmails(contact: ContactEntity, recipientEmails?: string[]): Promise<void> {
        const emails = recipientEmails || [];

        if (emails.length === 0) {
            this.logger.warn('Nenhum destinatário de e-mail fornecido para notificação de contato.');
            return;
        }

        const htmlBody = ContactEmailTemplate.generate(contact);
        const subject = 'Novo Contato - Orfanatos NIB';

        for (const email of emails) {
            try {
                await this.awsSESService.sendEmail(email, subject, '', htmlBody);
                this.logger.log(NotificationLogs.CONTACT_EMAIL_SENT(email));
            } catch (error) {
                this.logger.error(NotificationLogs.CONTACT_EMAIL_ERROR(email, error.message));
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
            await this.twilioService.sendWhatsAppMessage(whatsappFrom, whatsappTo, message);
            this.logger.log(NotificationLogs.CONTACT_WHATSAPP_SENT);
        } catch (error) {
            this.logger.error(NotificationLogs.CONTACT_WHATSAPP_ERROR(error.message));
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
        const env = process.env.ENVIRONMENT || 'local';
        if (env === 'prod' || env === 'production') {
            return 'https://www.orfanatonib.com';
        } else if (env === 'staging') {
            return 'https://staging.orfanatonib.com';
        }
        return 'http://localhost:5173';
    }
}
