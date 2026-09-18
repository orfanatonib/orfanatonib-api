import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ContactRepository } from "../contact.repository";
import { ContactEntity } from "../contact.entity";
import {
  ContactMessages,
  ContactNotificationLogs,
} from "../constants/contact.constants";

@Injectable()
export class UpdateContactService {
  private readonly logger = new Logger(UpdateContactService.name);

  constructor(private readonly contactRepo: ContactRepository) {}

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
}
