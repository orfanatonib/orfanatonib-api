import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Logger,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { CreateContactService } from "./services/create-contact.service";
import { GetContactService } from "./services/get-contact.service";
import { UpdateContactService } from "./services/update-contact.service";
import { DeleteContactService } from "./services/delete-contact.service";
import { ContactEntity } from "./contact.entity";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";

@Controller("contact")
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  constructor(
    private readonly createContactService: CreateContactService,
    private readonly getContactService: GetContactService,
    private readonly updateContactService: UpdateContactService,
    private readonly deleteContactService: DeleteContactService,
  ) {}

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      email: string;
      phone: string;
      message: string;
    },
  ): Promise<ContactEntity> {
    this.logger.log("Creating new contact message");
    const result = await this.createContactService.execute(body);
    this.logger.log(`Contact message created successfully: ${result.id}`);
    return result;
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async getAll(): Promise<ContactEntity[]> {
    return this.getContactService.getAllContacts();
  }

  @Patch(":id/read")
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async setRead(@Param("id") id: string): Promise<ContactEntity> {
    this.logger.log(`Marking contact as read: ${id}`);
    const result = await this.updateContactService.setReadOnContact(id);
    this.logger.log(`Contact marked as read successfully: ${id}`);
    return result;
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async delete(@Param("id") id: string): Promise<void> {
    this.logger.log(`Deleting contact: ${id}`);
    await this.deleteContactService.execute(id);
    this.logger.log(`Contact deleted successfully: ${id}`);
  }
}
