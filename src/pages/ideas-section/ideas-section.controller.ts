import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Param,
  Body,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/auth/guards/role-guard';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IdeasSectionUpdateService } from './services/ideas-section-update.service';
import { IdeasSectionGetService } from './services/ideas-section-get.service';
import { IdeasSectionDeleteService } from './services/ideas-section-delete.service';
import { IdeasSectionResponseDto } from './dto/ideas-section-response.dto';
import { CreateIdeasSectionDto } from './dto/create-ideas-section.dto';
import { UpdateIdeasSectionDto } from './dto/update-ideas-section.dto';
import { IdeasSectionCreateService } from './services/ideas-section-create.service';

@Controller('ideas-sections')
export class IdeasSectionController {
  private readonly logger = new Logger(IdeasSectionController.name);

  constructor(
    private readonly createService: IdeasSectionCreateService,
    private readonly updateService: IdeasSectionUpdateService,
    private readonly getService: IdeasSectionGetService,
    private readonly deleteService: IdeasSectionDeleteService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('sectionData') raw: string | Buffer,
  ): Promise<IdeasSectionResponseDto> {

    const parsedData = JSON.parse(Buffer.isBuffer(raw) ? raw.toString() : raw);
    const dto = plainToInstance(CreateIdeasSectionDto, parsedData);
    const validationErrors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (validationErrors.length > 0) {
      this.logger.error('Validation errors:', JSON.stringify(validationErrors, null, 2));
      throw new BadRequestException('Invalid data in request');
    }

    const filesDict: Record<string, Express.Multer.File> = {};
    files.forEach((file) => (filesDict[file.fieldname] = file));
    this.logger.log('Creating new ideas section');
    const result = await this.createService.createSection(dto, filesDict);
    this.logger.log(`Ideas section created successfully: ${result.id}`);
    return result;
  }

 @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Patch(':id')
  @UseInterceptors(AnyFilesInterceptor())
  async update(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('sectionData') raw: string | Buffer,
  ): Promise<IdeasSectionResponseDto> {

    const parsedData = JSON.parse(Buffer.isBuffer(raw) ? raw.toString() : raw);
    const dto = plainToInstance(UpdateIdeasSectionDto, parsedData);
    const validationErrors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (validationErrors.length > 0) {
      this.logger.error('Validation errors:', JSON.stringify(validationErrors, null, 2));
      throw new BadRequestException('Invalid data in request');
    }

    const filesDict: Record<string, Express.Multer.File> = {};
    files.forEach((file) => (filesDict[file.fieldname] = file));
    this.logger.log(`Updating ideas section: ${id}`);
    const result = await this.updateService.updateSection(id, dto, filesDict);
    this.logger.log(`Ideas section updated successfully: ${id}`);
    return result;
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Patch(':id/attach/:pageId')
  @UseInterceptors(AnyFilesInterceptor())
  async editAndAttachToPage(
    @Param('id') sectionId: string,
    @Param('pageId') pageId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('sectionData') raw: string,
  ): Promise<IdeasSectionResponseDto> {

    try {
      if (!raw) throw new BadRequestException('sectionData is required.');

      const parsedData = JSON.parse(Buffer.isBuffer(raw) ? raw.toString() : raw);
      const dto = plainToInstance(UpdateIdeasSectionDto, parsedData);
      const validationErrors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (validationErrors.length > 0) {
        this.logger.error('Validation errors:', JSON.stringify(validationErrors, null, 2));
        throw new BadRequestException('Invalid data in request');
      }

      const filesDict: Record<string, Express.Multer.File> = {};
      files.forEach((file) => (filesDict[file.fieldname] = file));

      this.logger.log(`Updating and attaching ideas section: ${sectionId} to page: ${pageId}`);
      const result = await this.updateService.editAndAttachSectionToPage(sectionId, pageId, dto, filesDict);
      this.logger.log(`Ideas section updated and attached successfully: ${sectionId}`);
      return result;
    } catch (error) {
      this.logger.error('Error editing and linking section', error);
      throw new BadRequestException('Error editing and linking ideas section.');
    }
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Delete(':id')
  async delete(@Param('id') id: string) {

    this.logger.log(`Deleting ideas section: ${id}`);
    await this.deleteService.deleteSection(id);
    this.logger.log(`Ideas section deleted successfully: ${id}`);

    return { message: 'Seção de ideias removida com sucesso.' };
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<IdeasSectionResponseDto> {

    const result = await this.getService.findOne(id);
    if (!result) {
      throw new NotFoundException(`Seção de ideias com id=${id} não encontrada`);
    }

    return result;
  }

  @Get()
  async getAll(): Promise<IdeasSectionResponseDto[]> {

    const result = await this.getService.findAll();
    return result;
  }

}
