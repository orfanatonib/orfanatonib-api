import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContactRepository } from './contact.repository';
import { AwsSESService } from 'src/infrastructure/aws/aws-ses.service';
import { ContactEntity } from './contact.entity';
import { Twilio } from 'twilio';
import { EmailTemplate } from './templates/email.template';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private readonly twilio: Twilio;

  constructor(
    private readonly contactRepo: ContactRepository,
    private readonly awsSESService: AwsSESService,
    private readonly configService: ConfigService,
  ) {
    this.twilio = new Twilio(
      this.configService.get<string>('TWILIO_ACCOUNT_SID') ?? '',
      this.configService.get<string>('TWILIO_AUTH_TOKEN') ?? '',
    );
  }

  async createContact(data: Partial<ContactEntity>): Promise<ContactEntity> {
    let contact: ContactEntity;
    try {
      contact = await this.contactRepo.saveContact(data);
    } catch (error) {
      this.logger.error(`Error saving contact: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error saving contact');
    }

    const htmlBody = EmailTemplate.generateContactEmailTemplate(contact);
    const subject = 'Novo Contato - Orfanato NIB';
    const to = this.configService.get<string>('SES_DEFAULT_TO') || '';

    if (!to) {
      this.logger.warn('SES_DEFAULT_TO not configured, skipping email send');
    } else {
    try {
        await this.awsSESService.sendEmail(to, subject, '', htmlBody);
    } catch (error) {
      this.logger.error(`Error sending email: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error sending contact email');
      }
    }

    const whatsappFrom = this.configService.get<string>('TWILIO_WHATSAPP_FROM');
    const whatsappTo = this.configService.get<string>('TWILIO_WHATSAPP_TO');

    if (whatsappFrom && whatsappTo) {
      const message = this.generateWhatsappMessage(contact);
      try {
        await this.twilio.messages.create({ body: message, from: whatsappFrom, to: whatsappTo });
      } catch (err) {
        this.logger.error(`Error sending WhatsApp: ${err.message}`, err.stack);
        throw new InternalServerErrorException('Error sending contact WhatsApp');
      }
    }

    return contact;
  }

  private generateWhatsappMessage(contact: ContactEntity): string {
    return `
📥 *Novo contato recebido via site Orfanato NIB!*

👤 *Nome:* ${contact.name}
📧 *E-mail:* ${contact.email}
📱 *Telefone:* ${contact.phone}

💬 *Mensagem:*
${contact.message}
    `.trim();
  }


  async getAllContacts(): Promise<ContactEntity[]> {
    try {
      return this.contactRepo.getAll();
    } catch (error) {
      this.logger.error('Error fetching contacts', error.stack);
      throw new InternalServerErrorException('Error fetching contacts');
    }
  }

  async setReadOnContact(id: string): Promise<ContactEntity> {
    try {
      const contact = await this.contactRepo.findOneById(id);

      if (!contact) {
        throw new NotFoundException('Contact not found');
      }

      contact.read = true;
      await this.contactRepo.save(contact);

      return contact;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error updating contact', error.stack);
      throw new InternalServerErrorException('Error updating contact');
    }
  }

  async deleteContact(id: string): Promise<void> {
    try {
      const contact = await this.contactRepo.findOneById(id);

      if (!contact) {
        throw new NotFoundException('Contact not found');
      }

      await this.contactRepo.remove(contact);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting contact ID=${id}`, error.stack);
      throw new InternalServerErrorException('Error deleting contact');
    }
  }
}
