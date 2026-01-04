import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  HttpCode,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validateOrReject, validateSync } from 'class-validator';

import { CreateMeditationService } from './services/create-meditation.service';
import { UpdateMeditationService } from './services/update-meditation.service';
import { DeleteMeditationService } from './services/delete-meditation.service';
import { GetMeditationService } from './services/get-meditation.service';

import { CreateMeditationDto } from './dto/create-meditation.dto';
import { UpdateMeditationDto } from './dto/update-meditation.dto';
import { MeditationEntity } from './entities/meditation.entity';
import { WeekMeditationResponseDto } from './dto/meditation-response-dto';

import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/core/auth/guards/role-guard';

@Controller('meditations')
export class MeditationController {
  private readonly logger = new Logger(MeditationController.name);

  constructor(
    private readonly createService: CreateMeditationService,
    private readonly updateService: UpdateMeditationService,
    private readonly deleteService: DeleteMeditationService,
    private readonly getService: GetMeditationService,
  ) { }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('meditationData') meditationDataRaw: string,
  ): Promise<MeditationEntity> {
    try {
      const parsed = JSON.parse(meditationDataRaw);
      const dto = plainToInstance(CreateMeditationDto, parsed);
      await validateOrReject(dto, { whitelist: true, forbidNonWhitelisted: true });

      this.logger.log('Creating new meditation');
      const result = await this.createService.create(dto, file);
      this.logger.log(`Meditation created successfully: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error('Error creating meditation', error.stack);
      const message =
        Array.isArray(error)
          ? error.map(e => Object.values(e.constraints || {})).flat().join('; ')
          : error?.message || 'Error creating meditation.';
      throw new BadRequestException(message);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(): Promise<WeekMeditationResponseDto[]> {
    return this.getService.findAll();
  }

  @Get('/this-week')
  @UseGuards(JwtAuthGuard)
  async getThisWeek(): Promise<WeekMeditationResponseDto> {
    return this.getService.getThisWeekMeditation();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string): Promise<WeekMeditationResponseDto> {
    return this.getService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @Body('meditationData') rawMeditationData: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<MeditationEntity> {
    let dto: UpdateMeditationDto;
    try {
      const parsed = JSON.parse(rawMeditationData);
      dto = plainToInstance(UpdateMeditationDto, parsed);
    } catch (err) {
      this.logger.error('Invalid JSON for meditation', err.stack);
      throw new BadRequestException('Invalid JSON in meditationData field');
    }

    const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      const message = errors
        .map(err => Object.values(err.constraints ?? {}).join(', '))
        .join(' | ');
      throw new BadRequestException(message);
    }

    this.logger.log(`Updating meditation: ${id}`);
    const result = await this.updateService.update(id, { ...dto, isLocalFile: !!file }, file);
    this.logger.log(`Meditation updated successfully: ${id}`);
    return result;
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting meditation: ${id}`);
    await this.deleteService.remove(id);
    this.logger.log(`Meditation deleted successfully: ${id}`);
  }
}
