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
  ParseUUIDPipe,
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
import { randomUUID } from "crypto";
import { isHoneypotTripped } from "./utils/contact-honeypot.util";
import { ContactPendingCountDto } from "./dto/contact-pending-count.dto";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";

@Controller("contact")
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  constructor(
    private readonly createContactService: CreateContactService,
    private readonly getContactService: GetContactService,
    private readonly updateContactService: UpdateContactService,
    private readonly deleteContactService: DeleteContactService,
  ) {}

  @FeatureFlag(FeatureFlagKeys.CONTACT_FORM)
  @UseGuards(FeatureFlagGuard)
  @Post()
  async create(@Body() body: CreateContactDto): Promise<ContactReceiptDto> {
    if (isHoneypotTripped(body.website)) {
      // Robô: responde como se tivesse enviado, sem gravar nem avisar ninguém.
      this.logger.warn("Contact form honeypot tripped; message discarded");
      return { id: randomUUID(), createdAt: new Date() };
    }
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

  @FeatureFlag(FeatureFlagKeys.CONTACT_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async getAll(): Promise<ContactResponseDto[]> {
    const contacts = await this.getContactService.getAllContacts();
    return contacts.map((contact) => ContactResponseDto.fromEntity(contact));
  }

  /** Selo do painel do admin: quantas mensagens ainda não foram lidas. */
  @FeatureFlag(FeatureFlagKeys.CONTACT_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Get("pending-count")
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async pendingCount(): Promise<ContactPendingCountDto> {
    return this.getContactService.pendingCount();
  }

  @FeatureFlag(FeatureFlagKeys.CONTACT_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Patch(":id/read")
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async setRead(@Param("id", ParseUUIDPipe) id: string): Promise<ContactResponseDto> {
    this.logger.log(`Marking contact as read: ${id}`);
    const result = await this.updateContactService.setReadOnContact(id);
    this.logger.log(`Contact marked as read successfully: ${id}`);
    return ContactResponseDto.fromEntity(result);
  }

  @FeatureFlag(FeatureFlagKeys.CONTACT_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Delete(":id")
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async delete(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    this.logger.log(`Deleting contact: ${id}`);
    await this.deleteContactService.execute(id);
    this.logger.log(`Contact deleted successfully: ${id}`);
  }
}
