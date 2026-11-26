import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ContactRepository } from "../contact.repository";
import {
  ContactMessages,
  ContactNotificationLogs,
} from "../constants/contact.constants";

@Injectable()
export class DeleteContactService {
  private readonly logger = new Logger(DeleteContactService.name);

  constructor(private readonly contactRepo: ContactRepository) {}

  async execute(id: string): Promise<void> {
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
