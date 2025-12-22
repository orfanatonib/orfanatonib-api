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

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/auth/guards/role-guard';

@Controller('documents')
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(
    private readonly createService: CreateDocumentService,
    private readonly updateService: UpdateDocumentService,
    private readonly getService: GetDocumentService,
    private readonly deleteService: DeleteDocumentService,
  ) {}

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
      this.logger.error('Error processing document data', error);
      throw new BadRequestException('Error processing document data.');
    }

    const file = dto.media?.fileField
      ? files?.find((f) => f.fieldname === dto.media.fileField)
      : undefined;

    return this.createService.createDocument(dto, file);
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
      this.logger.error('Error processing document data', error);
      throw new BadRequestException('Error processing document data.');
    }

    const file = dto.media?.fileField
      ? files?.find((f) => f.fieldname === dto.media.fileField)
      : undefined;

    return this.updateService.execute(id, dto, file);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.deleteService.execute(id);
  }
}
