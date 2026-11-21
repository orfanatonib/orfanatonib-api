import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { ContactRepository } from "../contact.repository";
import { ContactEntity } from "../contact.entity";
import { ContactPendingCountDto } from "../dto/contact-pending-count.dto";
import {
  ContactMessages,
  ContactNotificationLogs,
} from "../constants/contact.constants";

@Injectable()
export class GetContactService {
  private readonly logger = new Logger(GetContactService.name);

  constructor(private readonly contactRepo: ContactRepository) {}

  async getAllContacts(): Promise<ContactEntity[]> {
    try {
      return await this.contactRepo.getAll();
    } catch {
      this.logger.error(ContactNotificationLogs.FETCH_ERROR);
      throw new InternalServerErrorException(ContactMessages.FETCH_ERROR);
    }
  }

  async pendingCount(): Promise<ContactPendingCountDto> {
    try {
      return { pending: await this.contactRepo.countUnread() };
    } catch {
      this.logger.error(ContactNotificationLogs.FETCH_ERROR);
      throw new InternalServerErrorException(ContactMessages.FETCH_ERROR);
    }
  }
}
