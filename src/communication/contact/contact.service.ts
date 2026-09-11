import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ContactRepository } from "./contact.repository";
import { NotificationService } from "../notification/services/notification.service";
import { ContactEntity } from "./contact.entity";
import {
  ContactMessages,
  ContactNotificationLogs,
} from "./constants/contact.constants";
import { GetUsersService } from "src/core/user/services/get-user.service";

/** Mensagem de um `unknown` vindo de `catch`, sem `any`. */
const reasonOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly contactRepo: ContactRepository,
    private readonly notificationService: NotificationService,
    private readonly getUsersService: GetUsersService,
  ) {}

  async createContact(data: Partial<ContactEntity>): Promise<ContactEntity> {
    let contact: ContactEntity;
    try {
      contact = await this.contactRepo.saveContact(data);
    } catch (error: unknown) {
      this.logger.error(ContactNotificationLogs.SAVE_ERROR(reasonOf(error)));
      throw new InternalServerErrorException(ContactMessages.SAVE_ERROR);
    }

    this.handleNotifications(contact).catch((error) => {
      this.logger.error(
        ContactNotificationLogs.NOTIFICATION_ERROR(reasonOf(error)),
      );
    });

    return contact;
  }

  private async handleNotifications(contact: ContactEntity): Promise<void> {
    try {
      const adminEmails = await this.getUsersService.findAdminEmails();

      if (adminEmails.length > 0) {
        await this.notificationService.sendContactNotification(
          {
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            message: contact.message,
          },
          adminEmails,
        );
      } else {
        this.logger.warn(
          "Nenhum Admin ativo encontrado para receber notificação de contato.",
        );
      }
    } catch (error: unknown) {
      this.logger.error(
        ContactNotificationLogs.NOTIFICATION_ERROR(reasonOf(error)),
      );
    }
  }

  async getAllContacts(): Promise<ContactEntity[]> {
    try {
      return this.contactRepo.getAll();
    } catch {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(ContactNotificationLogs.DELETE_ERROR(id));
      throw new InternalServerErrorException(ContactMessages.DELETE_ERROR);
    }
  }
}
