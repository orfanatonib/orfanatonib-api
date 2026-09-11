import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";

import { PaginatedResponseDto } from "src/shared/dto/paginated-response.dto";

import { AdminRoleGuard } from "../auth/guards/role-guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthContextService } from "../auth/services/auth-context.service";
import { CreateFeatureFlagDto } from "./dto/create-feature-flag.dto";
import { FeatureFlagResponseDto } from "./dto/feature-flag-response.dto";
import { FeatureFlagStatsDto } from "./dto/feature-flag-stats.dto";
import { QueryFeatureFlagsDto } from "./dto/query-feature-flags.dto";
import { UpdateFeatureFlagDto } from "./dto/update-feature-flag.dto";
import { CreateFeatureFlagService } from "./services/create-feature-flag.service";
import { DeleteFeatureFlagService } from "./services/delete-feature-flag.service";
import { GetFeatureFlagsService } from "./services/get-feature-flags.service";
import { UpdateFeatureFlagService } from "./services/update-feature-flag.service";

@Controller("feature-flags")
export class FeatureFlagsController {
  private readonly logger = new Logger(FeatureFlagsController.name);

  constructor(
    private readonly createService: CreateFeatureFlagService,
    private readonly getService: GetFeatureFlagsService,
    private readonly updateService: UpdateFeatureFlagService,
    private readonly deleteService: DeleteFeatureFlagService,
    private readonly authContext: AuthContextService,
  ) {}

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post()
  async create(
    @Body() dto: CreateFeatureFlagDto,
  ): Promise<FeatureFlagResponseDto> {
    this.logger.debug(`POST /feature-flags | key=${dto.key}`);
    return this.createService.create(dto);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post("seed")
  async seed(): Promise<{
    message: string;
    count: number;
    created: FeatureFlagResponseDto[];
    retired: string[];
  }> {
    const { created, retired } = await this.createService.synchronizeCatalog();
    return {
      message: "Catálogo de feature flags conferido",
      count: created.length,
      created,
      retired,
    };
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Get()
  async findAll(
    @Query() query: QueryFeatureFlagsDto,
  ): Promise<PaginatedResponseDto<FeatureFlagResponseDto>> {
    return this.getService.findAllPaginated(query);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Get("stats")
  async stats(): Promise<FeatureFlagStatsDto> {
    return this.getService.getStats();
  }

  @Get("map")
  async getFlagsMap(@Req() request: Request): Promise<Record<string, boolean>> {
    const role = await this.authContext.getRole(request);
    return this.getService.getFlagsMap(role);
  }

  @Get("check/:key")
  async check(
    @Param("key") key: string,
    @Req() request: Request,
  ): Promise<{ key: string; enabled: boolean }> {
    const role = await this.authContext.getRole(request);
    return {
      key,
      enabled: await this.getService.isEnabledForRole(key, role),
    };
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Get("environment/:environment")
  async findByEnvironment(
    @Param("environment") environment: string,
  ): Promise<FeatureFlagResponseDto[]> {
    return this.getService.findByEnvironment(environment);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Get(":key")
  async findOne(@Param("key") key: string): Promise<FeatureFlagResponseDto> {
    return this.getService.findOne(key);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Patch(":key")
  async update(
    @Param("key") key: string,
    @Body() dto: UpdateFeatureFlagDto,
  ): Promise<FeatureFlagResponseDto> {
    return this.updateService.update(key, dto);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Patch(":key/toggle")
  async toggle(@Param("key") key: string): Promise<FeatureFlagResponseDto> {
    return this.updateService.toggle(key);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Delete(":key")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("key") key: string): Promise<void> {
    await this.deleteService.remove(key);
  }
}
