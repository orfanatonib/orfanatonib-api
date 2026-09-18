import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { ContactRepository } from "../contact.repository";
import { NotificationService } from "../../notification/services/notification.service";
import { ContactEntity } from "../contact.entity";
import {
  ContactMessages,
  ContactNotificationLogs,
} from "../constants/contact.constants";
import { GetUsersService } from "src/core/user/services/get-user.service";

const reasonOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

@Injectable()
export class CreateContactService {
  private readonly logger = new Logger(CreateContactService.name);

  constructor(
    private readonly contactRepo: ContactRepository,
    private readonly notificationService: NotificationService,
    private readonly getUsersService: GetUsersService,
  ) {}

  async execute(data: Partial<ContactEntity>): Promise<ContactEntity> {
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
}
