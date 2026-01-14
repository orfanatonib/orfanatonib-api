import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  UploadedFiles,
  Body,
  UseInterceptors,
  BadRequestException,
  Logger,
  UseGuards,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateVideosPageDto } from './dto/create-videos-page.dto';
import { UpdateVideosPageDto } from './dto/update-videos-page.dto';
import { VideosPageResponseDto } from './dto/videos-page-response.dto';
import { CreateVideosPageService } from './services/videos-page.create.service';
import { UpdateVideosPageService } from './services/videos-page.update.service';
import { GetVideosPageService } from './services/videos-page.get.service';
import { DeleteVideosPageService } from './services/videos-page.delete.service';
import { AdminRoleGuard } from 'src/core/auth/guards/role-guard';

@Controller('video-pages')
export class VideosPageController {
  private readonly logger = new Logger(VideosPageController.name);

  constructor(
    private readonly createService: CreateVideosPageService,
    private readonly updateService: UpdateVideosPageService,
    private readonly getService: GetVideosPageService,
    private readonly deleteService: DeleteVideosPageService,
  ) { }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('videosPageData') raw: string,
  ): Promise<VideosPageResponseDto> {

    try {
      const parsedData = JSON.parse(raw);
      const dto = plainToInstance(CreateVideosPageDto, parsedData);

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

      this.logger.log('Creating new videos page');
      const result = await this.createService.execute(dto, filesDict);
      this.logger.log(`Videos page created successfully: ${result.id}`);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error creating videos page', error);
      throw new BadRequestException('Error creating videos page.');
    }
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Patch(':id')
  @UseInterceptors(AnyFilesInterceptor())
  async update(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('videosPageData') raw: string,
  ): Promise<VideosPageResponseDto> {

    try {
      const parsedData = JSON.parse(raw);
      const dto = plainToInstance(UpdateVideosPageDto, parsedData);

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

      this.logger.log(`Updating videos page: ${id}`);
      const result = await this.updateService.execute(id, dto, filesDict);
      this.logger.log(`Videos page updated successfully: ${id}`);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error updating videos page', error);
      throw new BadRequestException('Error updating videos page.');
    }
  }

  @Get()
  async findAll(): Promise<VideosPageResponseDto[]> {
    return this.getService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<VideosPageResponseDto> {
    try {
      return await this.getService.findOne(id);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error('Error fetching videos page', err);
      throw new BadRequestException('Error fetching videos page.');
    }
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    this.logger.log(`Deleting videos page: ${id}`);
    await this.deleteService.execute(id);
    this.logger.log(`Videos page deleted successfully: ${id}`);
    return { message: 'Página de vídeos removida com sucesso' };
  }
}
