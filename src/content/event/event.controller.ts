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
import { EventEntity } from "./entities/event.entity";
import { EventResponseDto } from "./dto/event-response.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { QueryEventDto } from "./dto/query-event.dto";

@Controller("events")
export class EventController {
  private readonly logger = new Logger(EventController.name);

  constructor(
    private readonly createService: CreateEventService,
    private readonly updateService: UpdateEventService,
    private readonly deleteService: DeleteEventService,
    private readonly getService: GetEventService,
  ) {}

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post()
  @UseInterceptors(FileInterceptor("file"))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body("eventData") eventDataRaw: string,
  ): Promise<EventEntity> {
    try {
      const parsed = JSON.parse(eventDataRaw);
      const dto = plainToInstance(CreateEventDto, parsed);
      await validateOrReject(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      this.logger.log("Creating new event");
      const result = await this.createService.create(dto, file);
      this.logger.log(`Event created successfully: ${result.id}`);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error("Error creating event", error.stack);
      const message = Array.isArray(error)
        ? error
            .map((e) => Object.values(e.constraints || {}))
            .flat()
            .join("; ")
        : error?.message || "Erro ao criar evento.";
      throw new BadRequestException(message);
    }
  }

  @Get()
  async findAll(
    @Req() req: Request,
    @Query() query: QueryEventDto,
  ): Promise<EventResponseDto[]> {
    return this.getService.findAll(req, query);
  }

  @Get("/upcoming")
  async getUpcoming(@Req() req: Request): Promise<EventResponseDto[]> {
    return this.getService.getUpcomingOrTodayEvents(req);
  }

  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @Req() req: Request,
  ): Promise<EventResponseDto> {
    return this.getService.findOne(id, req);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Patch(":id")
  @UseInterceptors(FileInterceptor("file"))
  async update(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("eventData") eventDataRaw: string,
  ): Promise<EventEntity> {
    try {
      const parsed = JSON.parse(eventDataRaw);
      const dto = plainToInstance(UpdateEventDto, parsed);
      await validateOrReject(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      this.logger.log(`Updating event ID=${id}`);
      const result = await this.updateService.update(id, dto, file);
      this.logger.log(`Event updated successfully: ${result.id}`);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error updating event ID=${id}`, error.stack);
      const message = Array.isArray(error)
        ? error
            .map((e) => Object.values(e.constraints || {}))
            .flat()
            .join("; ")
        : error?.message || "Erro ao atualizar evento.";
      throw new BadRequestException(message);
    }
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id") id: string): Promise<void> {
    this.logger.log(`Deleting event ID=${id}`);
    await this.deleteService.remove(id);
    this.logger.log(`Event deleted successfully: ID=${id}`);
  }
}
