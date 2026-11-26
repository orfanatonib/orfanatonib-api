import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  Logger,
  BadRequestException,
  UseGuards,
  Req,
  HttpException,
  Query,
} from "@nestjs/common";
import { Request } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { plainToInstance } from "class-transformer";
import { validateOrReject } from "class-validator";
import { CreateEventDto } from "./dto/create-event.dto";

import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { CreateEventService } from "./services/create-event.service";
import { UpdateEventService } from "./services/update-event.service";
import { DeleteEventService } from "./services/delete-event.service";
import { GetEventService } from "./services/get-event.service";
import { validationMessage } from "src/common/utils/validation-message.util";
import { EventResponseDto } from "./dto/event-response.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { QueryEventDto } from "./dto/query-event.dto";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";

/** Imagem do evento: um arquivo de até 10 MB (MIME validado no MediaStorageService). */
export const EVENT_UPLOAD_OPTIONS = {
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
} as const;

const parseEventData = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    throw new BadRequestException("eventData deve ser um JSON válido.");
  }
};

@Controller("events")
export class EventController {
  private readonly logger = new Logger(EventController.name);

  constructor(
    private readonly createService: CreateEventService,
    private readonly updateService: UpdateEventService,
    private readonly deleteService: DeleteEventService,
    private readonly getService: GetEventService,
  ) {}

  @FeatureFlag(FeatureFlagKeys.EVENT_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post()
  @UseInterceptors(FileInterceptor("file", EVENT_UPLOAD_OPTIONS))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body("eventData") eventDataRaw: string,
  ): Promise<EventResponseDto> {
    try {
      const parsed = parseEventData(eventDataRaw);
      const dto = plainToInstance(CreateEventDto, parsed);
      await validateOrReject(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      this.logger.log("Creating new event");
      const result = await this.createService.create(dto, file);
      this.logger.log(`Event created successfully: ${result.id}`);
      return EventResponseDto.fromEntity(result);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        "Error creating event",
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException(
        validationMessage(error, "Erro ao criar evento."),
      );
    }
  }

  @FeatureFlag(FeatureFlagKeys.EVENTS_SECTION)
  @UseGuards(FeatureFlagGuard)
  @Get()
  async findAll(
    @Req() req: Request,
    @Query() query: QueryEventDto,
  ): Promise<EventResponseDto[]> {
    return this.getService.findAll(req, query);
  }

  @FeatureFlag(FeatureFlagKeys.EVENTS_SECTION)
  @UseGuards(FeatureFlagGuard)
  @Get("/upcoming")
  async getUpcoming(@Req() req: Request): Promise<EventResponseDto[]> {
    return this.getService.getUpcomingOrTodayEvents(req);
  }

  @FeatureFlag(FeatureFlagKeys.EVENTS_SECTION)
  @UseGuards(FeatureFlagGuard)
  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @Req() req: Request,
  ): Promise<EventResponseDto> {
    return this.getService.findOne(id, req);
  }

  @FeatureFlag(FeatureFlagKeys.EVENT_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Patch(":id")
  @UseInterceptors(FileInterceptor("file", EVENT_UPLOAD_OPTIONS))
  async update(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("eventData") eventDataRaw: string,
  ): Promise<EventResponseDto> {
    try {
      const parsed = parseEventData(eventDataRaw);
      const dto = plainToInstance(UpdateEventDto, parsed);
      await validateOrReject(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      this.logger.log(`Updating event ID=${id}`);
      const result = await this.updateService.update(id, dto, file);
      this.logger.log(`Event updated successfully: ${result.id}`);
      return EventResponseDto.fromEntity(result);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error updating event ID=${id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException(
        validationMessage(error, "Erro ao atualizar evento."),
      );
    }
  }

  @FeatureFlag(FeatureFlagKeys.EVENT_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id") id: string): Promise<void> {
    this.logger.log(`Deleting event ID=${id}`);
    await this.deleteService.remove(id);
    this.logger.log(`Event deleted successfully: ID=${id}`);
  }
}
