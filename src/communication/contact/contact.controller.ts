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
import {
  ContactReceiptDto,
  ContactResponseDto,
} from "./dto/contact-response.dto";
import { CreateContactDto } from "./dto/create-contact.dto";
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
  async create(@Body() body: CreateContactDto): Promise<ContactReceiptDto> {
    this.logger.log("Creating new contact message");
    // Só os campos do DTO chegam ao serviço: `read`, `id` etc. nunca vêm do cliente.
    const result = await this.createContactService.execute({
      name: body.name,
      email: body.email,
      phone: body.phone,
      message: body.message,
    });
    this.logger.log(`Contact message created successfully: ${result.id}`);
    return ContactReceiptDto.fromEntity(result);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async getAll(): Promise<ContactResponseDto[]> {
    const contacts = await this.getContactService.getAllContacts();
    return contacts.map((contact) => ContactResponseDto.fromEntity(contact));
  }

  @Patch(":id/read")
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async setRead(@Param("id") id: string): Promise<ContactResponseDto> {
    this.logger.log(`Marking contact as read: ${id}`);
    const result = await this.updateContactService.setReadOnContact(id);
    this.logger.log(`Contact marked as read successfully: ${id}`);
    return ContactResponseDto.fromEntity(result);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async delete(@Param("id") id: string): Promise<void> {
    this.logger.log(`Deleting contact: ${id}`);
    await this.deleteContactService.execute(id);
    this.logger.log(`Contact deleted successfully: ${id}`);
  }
}
