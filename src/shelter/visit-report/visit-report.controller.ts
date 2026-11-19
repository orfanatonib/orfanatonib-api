import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  Logger,
  UseGuards,
  ValidationPipe,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { CreateVisitReportDto } from "./dto/create-visit-report.dto";
import { UpdateVisitReportDto } from "./dto/update-visit-report.dto";
import { VisitReportResponseDto } from "./dto/visit-report-response.dto";
import { CreateVisitReportService } from "./services/create-visit-report.service";
import { ListVisitReportsService } from "./services/list-visit-reports.service";
import { UpdateVisitReportService } from "./services/update-visit-report.service";
import { DeleteVisitReportService } from "./services/delete-visit-report.service";
import type { AuthenticatedRequest } from "src/core/auth/auth.types";
import { toShelterAccessContext } from "src/shelter/shelter/utils/shelter-access.util";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminOrLeaderRoleGuard } from "src/core/auth/guards/role-guard";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";

@Controller("visit-reports")
@UseGuards(JwtAuthGuard, AdminOrLeaderRoleGuard)
export class VisitReportController {
  private readonly logger = new Logger(VisitReportController.name);

  constructor(
    private readonly createService: CreateVisitReportService,
    private readonly listService: ListVisitReportsService,
    private readonly updateService: UpdateVisitReportService,
    private readonly deleteService: DeleteVisitReportService,
  ) {}

  @FeatureFlag(FeatureFlagKeys.VISIT_REPORTS)
  @UseGuards(FeatureFlagGuard)
  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(ValidationPipe) dto: CreateVisitReportDto,
  ): Promise<VisitReportResponseDto> {
    this.logger.log("Creating new visit report");
    const result = await this.createService.execute(
      dto,
      toShelterAccessContext(req),
    );
    this.logger.log(`Visit report created successfully: ${result.id}`);
    return VisitReportResponseDto.fromEntity(result);
  }

  @FeatureFlag(FeatureFlagKeys.VISIT_REPORTS)
  @UseGuards(FeatureFlagGuard)
  @Get()
  async findAll(@Req() req: Request): Promise<VisitReportResponseDto[]> {
    this.logger.log("Listing visit reports");
    const reports = await this.listService.execute(req);
    return reports.map((report) => VisitReportResponseDto.fromEntity(report));
  }

  @FeatureFlag(FeatureFlagKeys.VISIT_REPORTS)
  @UseGuards(FeatureFlagGuard)
  @Get(":id")
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<VisitReportResponseDto> {
    this.logger.log(`Finding visit report: ${id}`);
    const report = await this.listService.findOne(
      id,
      toShelterAccessContext(req),
    );
    return VisitReportResponseDto.fromEntity(report);
  }

  @FeatureFlag(FeatureFlagKeys.VISIT_REPORTS)
  @UseGuards(FeatureFlagGuard)
  @Put(":id")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(ValidationPipe) dto: UpdateVisitReportDto,
  ): Promise<VisitReportResponseDto> {
    this.logger.log(`Updating visit report: ${id}`);
    const result = await this.updateService.execute(
      id,
      dto,
      toShelterAccessContext(req),
    );
    this.logger.log(`Visit report updated successfully: ${id}`);
    return VisitReportResponseDto.fromEntity(result);
  }

  @FeatureFlag(FeatureFlagKeys.VISIT_REPORTS)
  @UseGuards(FeatureFlagGuard)
  @Delete(":id")
  @HttpCode(204)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<void> {
    this.logger.log(`Deleting visit report: ${id}`);
    await this.deleteService.execute(id, toShelterAccessContext(req));
    this.logger.log(`Visit report deleted successfully: ${id}`);
  }
}
