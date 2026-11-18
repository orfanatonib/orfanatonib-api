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
  HttpException,
  Query,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { plainToInstance } from "class-transformer";
import { validateOrReject } from "class-validator";

import { CreateMeditationService } from "./services/create-meditation.service";
import { UpdateMeditationService } from "./services/update-meditation.service";
import { DeleteMeditationService } from "./services/delete-meditation.service";
import { GetMeditationService } from "./services/get-meditation.service";

import { CreateMeditationDto } from "./dto/create-meditation.dto";
import { UpdateMeditationDto } from "./dto/update-meditation.dto";
import {
  errorStack,
  validationMessage,
} from "src/common/utils/validation-message.util";
import {
  MeditationDto,
  WeekMeditationResponseDto,
} from "./dto/meditation-response.dto";
import { QueryMeditationDto } from "./dto/query-meditation.dto";

import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { SINGLE_MEDIA_UPLOAD_OPTIONS } from "src/shared/media/storage/upload-limits.constants";

@Controller("meditations")
export class MeditationController {
  private readonly logger = new Logger(MeditationController.name);

  constructor(
    private readonly createService: CreateMeditationService,
    private readonly updateService: UpdateMeditationService,
    private readonly deleteService: DeleteMeditationService,
    private readonly getService: GetMeditationService,
  ) {}

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post()
  @UseInterceptors(FileInterceptor("file", SINGLE_MEDIA_UPLOAD_OPTIONS))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body("meditationData") meditationDataRaw: string,
  ): Promise<MeditationDto> {
    try {
      const parsed: unknown = JSON.parse(meditationDataRaw);
      const dto = plainToInstance(CreateMeditationDto, parsed);
      await validateOrReject(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      this.logger.log("Creating new meditation");
      const result = await this.createService.create(dto, file);
      this.logger.log(`Meditation created successfully: ${result.id}`);
      return MeditationDto.fromEntity(result, null);
    } catch (error) {
      if (
        error instanceof HttpException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error("Error creating meditation", errorStack(error));
      throw new BadRequestException(
        validationMessage(error, "Error creating meditation."),
      );
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query() query: QueryMeditationDto,
  ): Promise<WeekMeditationResponseDto[]> {
    return this.getService.findAll(query);
  }

  @Get("/this-week")
  @UseGuards(JwtAuthGuard)
  async getThisWeek(): Promise<WeekMeditationResponseDto> {
    return this.getService.getThisWeekMeditation();
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async findOne(@Param("id") id: string): Promise<WeekMeditationResponseDto> {
    return this.getService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Patch(":id")
  @UseInterceptors(FileInterceptor("file", SINGLE_MEDIA_UPLOAD_OPTIONS))
  async update(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("meditationData") meditationDataRaw: string,
  ): Promise<MeditationDto> {
    try {
      const parsed: unknown = JSON.parse(meditationDataRaw);
      const dto = plainToInstance(UpdateMeditationDto, parsed);
      await validateOrReject(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      this.logger.log(`Updating meditation ID=${id}`);
      const result = await this.updateService.update(id, dto, file);
      this.logger.log(`Meditation updated successfully: ${result.id}`);
      return MeditationDto.fromEntity(result, null);
    } catch (error) {
      if (
        error instanceof HttpException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error updating meditation ID=${id}`,
        errorStack(error),
      );
      throw new BadRequestException(
        validationMessage(error, "Error updating meditation."),
      );
    }
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id") id: string): Promise<void> {
    this.logger.log(`Deleting meditation ID=${id}`);
    await this.deleteService.remove(id);
    this.logger.log(`Meditation deleted successfully: ID=${id}`);
  }
}
