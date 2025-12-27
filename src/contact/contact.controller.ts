import { Body, Controller, Post, Get, Patch, Param, Logger, Delete, UseGuards } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactEntity } from './contact.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/auth/guards/role-guard';

@Controller('contact')
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  constructor(private readonly contactService: ContactService) { }

  @Post()
  async create(@Body() body: {
    name: string;
    email: string;
    phone: string;
    message: string;
  }): Promise<ContactEntity> {
    this.logger.log('Creating new contact message');
    const result = await this.contactService.createContact(body);
    this.logger.log(`Contact message created successfully: ${result.id}`);
    return result;
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async getAll(): Promise<ContactEntity[]> {
    return this.contactService.getAllContacts();
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async setRead(@Param('id') id: string): Promise<ContactEntity> {
    this.logger.log(`Marking contact as read: ${id}`);
    const result = await this.contactService.setReadOnContact(id);
    this.logger.log(`Contact marked as read successfully: ${id}`);
    return result;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting contact: ${id}`);
    await this.contactService.deleteContact(id);
    this.logger.log(`Contact deleted successfully: ${id}`);
  }
}
