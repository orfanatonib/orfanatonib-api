import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ContactRepository } from './contact.repository';
import { NotificationService } from '../notification/notification.service';
import { ContactEntity } from './contact.entity';
import { ContactMessages, ContactNotificationLogs } from './constants/contact.constants';
import { UserRepository } from 'src/core/user/user.repository';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly contactRepo: ContactRepository,
    private readonly notificationService: NotificationService,
    private readonly userRepo: UserRepository,
  ) { }

  async createContact(data: Partial<ContactEntity>): Promise<ContactEntity> {
    let contact: ContactEntity;
    try {
      contact = await this.contactRepo.saveContact(data);
    } catch (error) {
      this.logger.error(ContactNotificationLogs.SAVE_ERROR(error.message));
      throw new InternalServerErrorException(ContactMessages.SAVE_ERROR);
    }

    this.handleNotifications(contact).catch((error) => {
      this.logger.error(ContactNotificationLogs.NOTIFICATION_ERROR(error.message));
    });

    return contact;
  }

  private async handleNotifications(contact: ContactEntity): Promise<void> {
    try {
      const admins = await this.userRepo.findAllAdmins();
      const adminEmails = admins.map((admin) => admin.email).filter((email) => !!email);

      if (adminEmails.length > 0) {
        await this.notificationService.sendContactNotification(contact, adminEmails);
      } else {
        this.logger.warn('Nenhum Admin ativo encontrado para receber notificação de contato.');
      }
    } catch (error) {
      this.logger.error(ContactNotificationLogs.NOTIFICATION_ERROR(error.message));
    }
  }


  async getAllContacts(): Promise<ContactEntity[]> {
    try {
      return this.contactRepo.getAll();
    } catch (error) {
      this.logger.error(ContactNotificationLogs.FETCH_ERROR);
      throw new InternalServerErrorException(ContactMessages.FETCH_ERROR);
    }
  }

  async setReadOnContact(id: string): Promise<ContactEntity> {
    try {
      const contact = await this.contactRepo.findOneById(id);

      if (!contact) {
        throw new NotFoundException(ContactMessages.NOT_FOUND);
      }

      contact.read = true;
      await this.contactRepo.save(contact);

      return contact;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(ContactNotificationLogs.UPDATE_ERROR(id));
      throw new InternalServerErrorException(ContactMessages.UPDATE_ERROR);
    }
  }

  async deleteContact(id: string): Promise<void> {
    try {
      const contact = await this.contactRepo.findOneById(id);

      if (!contact) {
        throw new NotFoundException(ContactMessages.NOT_FOUND);
      }

      await this.contactRepo.remove(contact);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(ContactNotificationLogs.DELETE_ERROR(id));
      throw new InternalServerErrorException(ContactMessages.DELETE_ERROR);
    }
  }
}
