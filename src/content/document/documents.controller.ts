import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
  Logger,
  UseGuards,
  HttpException,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

import { CreateDocumentService } from './services/create-document.service';
import { UpdateDocumentService } from './services/update-document.service';
import { GetDocumentService } from './services/get-document.service';
import { DeleteDocumentService } from './services/delete-document.service';

import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/core/auth/guards/role-guard';

@Controller('documents')
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(
    private readonly createService: CreateDocumentService,
    private readonly updateService: UpdateDocumentService,
    private readonly getService: GetDocumentService,
    private readonly deleteService: DeleteDocumentService,
  ) { }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('documentData') documentDataRaw?: string,
  ) {
    if (!documentDataRaw) {
      throw new BadRequestException('Field "documentData" not sent.');
    }

    let dto: CreateDocumentDto;
    try {
      const parsed = JSON.parse(documentDataRaw);
      dto = plainToInstance(CreateDocumentDto, parsed);
      await validateOrReject(dto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error processing document data', error);
      throw new BadRequestException('Error processing document data.');
    }

    const file = dto.media?.fileField
      ? files?.find((f) => f.fieldname === dto.media.fileField)
      : undefined;

    this.logger.log('Creating new document');
    const result = await this.createService.createDocument(dto, file);
    this.logger.log(`Document created successfully: ${result.id}`);
    return result;
  }

  @Get()
  async findAll() {
    return this.getService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.getService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Patch(':id')
  @UseInterceptors(AnyFilesInterceptor())
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('documentData') documentDataRaw?: string,
  ) {
    if (!documentDataRaw) {
      throw new BadRequestException('Field "documentData" not sent.');
    }

    let dto: UpdateDocumentDto;
    try {
      const parsed = JSON.parse(documentDataRaw);
      dto = plainToInstance(UpdateDocumentDto, parsed);
      dto.id = id;
      await validateOrReject(dto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error processing document data', error);
      throw new BadRequestException('Error processing document data.');
    }

    const file = dto.media?.fileField
      ? files?.find((f) => f.fieldname === dto.media.fileField)
      : undefined;

    this.logger.log(`Updating document: ${id}`);
    const result = await this.updateService.execute(id, dto, file);
    this.logger.log(`Document updated successfully: ${id}`);
    return result;
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`Deleting document: ${id}`);
    await this.deleteService.execute(id);
    this.logger.log(`Document deleted successfully: ${id}`);
  }
}
