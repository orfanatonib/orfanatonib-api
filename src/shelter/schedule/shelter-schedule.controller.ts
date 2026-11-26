import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  Logger,
  UseGuards,
  ValidationPipe,
  Req,
  Query,
} from "@nestjs/common";
import { Request } from "express";
import type { AuthenticatedRequest } from "src/core/auth/auth.types";
import { toShelterAccessContext } from "src/shelter/shelter/utils/shelter-access.util";
import { CreateShelterScheduleDto } from "./dto/create-shelter-schedule.dto";
import { UpdateShelterScheduleDto } from "./dto/update-shelter-schedule.dto";
import { ShelterScheduleResponseDto } from "./dto/shelter-schedule-response.dto";
import { QueryShelterScheduleDto } from "./dto/query-shelter-schedule.dto";
import { PaginatedResponseDto } from "src/shared/dto/paginated-response.dto";
import { CreateShelterScheduleService } from "./services/create-shelter-schedule.service";
import { ListShelterSchedulesService } from "./services/list-shelter-schedules.service";
import { UpdateShelterScheduleService } from "./services/update-shelter-schedule.service";
import { DeleteShelterScheduleService } from "./services/delete-shelter-schedule.service";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminOrLeaderRoleGuard } from "src/core/auth/guards/role-guard";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";

@Controller("shelter-schedules")
@UseGuards(JwtAuthGuard)
export class ShelterScheduleController {
  private readonly logger = new Logger(ShelterScheduleController.name);

  constructor(
    private readonly createService: CreateShelterScheduleService,
    private readonly listService: ListShelterSchedulesService,
    private readonly updateService: UpdateShelterScheduleService,
    private readonly deleteService: DeleteShelterScheduleService,
  ) {}

  @FeatureFlag(FeatureFlagKeys.SHELTER_SCHEDULE)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(AdminOrLeaderRoleGuard)
  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(ValidationPipe) dto: CreateShelterScheduleDto,
  ): Promise<ShelterScheduleResponseDto> {
    this.logger.log("Creating new shelter schedule");
    const result = await this.createService.executeAs(
      toShelterAccessContext(req),
      dto,
    );
    this.logger.log(`Shelter schedule created successfully: ${result.id}`);
    return ShelterScheduleResponseDto.fromEntity(result);
  }

  // O membro lê a agenda da própria equipe (o serviço escopa): `shelter_schedule` é de admin/líder.
  @FeatureFlag({
    anyOf: [FeatureFlagKeys.SHELTER_SCHEDULE, FeatureFlagKeys.MEMBER_AREA],
  })
  @UseGuards(FeatureFlagGuard)
  @Get()
  async findAll(
    @Req() req: Request,
    @Query() query: QueryShelterScheduleDto,
  ): Promise<
    | ShelterScheduleResponseDto[]
    | PaginatedResponseDto<ShelterScheduleResponseDto>
  > {
    this.logger.log("Listing shelter schedules");
    return this.listService.executeQuery(req, query);
  }

  @FeatureFlag(FeatureFlagKeys.SHELTER_SCHEDULE)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(AdminOrLeaderRoleGuard)
  @Put(":id")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(ValidationPipe) dto: UpdateShelterScheduleDto,
  ): Promise<ShelterScheduleResponseDto> {
    this.logger.log(`Updating shelter schedule: ${id}`);
    const result = await this.updateService.executeAs(
      toShelterAccessContext(req),
      id,
      dto,
    );
    this.logger.log(`Shelter schedule updated successfully: ${id}`);
    return ShelterScheduleResponseDto.fromEntity(result);
  }

  @FeatureFlag(FeatureFlagKeys.SHELTER_SCHEDULE)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(AdminOrLeaderRoleGuard)
  @Delete(":id")
  @HttpCode(204)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    this.logger.log(`Deleting shelter schedule: ${id}`);
    await this.deleteService.executeAs(toShelterAccessContext(req), id);
    this.logger.log(`Shelter schedule deleted successfully: ${id}`);
  }
}
