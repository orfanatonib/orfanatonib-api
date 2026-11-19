import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { UnauthenticatedException } from "src/common/exceptions";
import { AuthenticatedRequest } from "src/core/auth/auth.types";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";

import { ContentStudioCatalogResponseDto } from "./dto/content-studio-catalog-response.dto";
import { ContentStudioDashboardResponseDto } from "./dto/content-studio-dashboard-response.dto";
import { ApproveReviewStageDto } from "./dto/approve-review-stage.dto";
import { ContentGenerationJobResponseDto } from "./dto/content-generation-job-response.dto";
import {
  ContentPackageListItemResponseDto,
  ContentPackageResponseDto,
  PaginatedContentPackagesResponseDto,
} from "./dto/content-package-response.dto";
import { CreateContentPackageDto } from "./dto/create-content-package.dto";
import { QueryContentPackagesDto } from "./dto/query-content-packages.dto";
import { QueryContentStudioDashboardDto } from "./dto/query-content-studio-dashboard.dto";
import { RequestStageChangesDto } from "./dto/request-stage-changes.dto";
import { RequestStageGenerationDto } from "./dto/request-stage-generation.dto";
import { SaveStageContentDto } from "./dto/save-stage-content.dto";
import { ApproveReviewStageService } from "./services/approve-review-stage.service";
import { ArchiveContentPackageService } from "./services/archive-content-package.service";
import { CompleteProductionStageService } from "./services/complete-production-stage.service";
import { CreateContentPackageService } from "./services/create-content-package.service";
import { GetContentStudioCatalogService } from "./services/get-content-studio-catalog.service";
import { GetContentPackagesService } from "./services/get-content-packages.service";
import { GetContentStudioDashboardService } from "./services/get-content-studio-dashboard.service";
import { RequestStageChangesService } from "./services/request-stage-changes.service";
import { ResolveReviewCommentService } from "./services/resolve-review-comment.service";
import { GetLatestStageGenerationService } from "./services/get-latest-stage-generation.service";
import { CancelStageGenerationService } from "./services/cancel-stage-generation.service";
import { RequestStageGenerationService } from "./services/request-stage-generation.service";
import { SaveStageContentService } from "./services/save-stage-content.service";
import { SubmitPackageReviewService } from "./services/submit-package-review.service";

@Controller("content-studio")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class ContentStudioController {
  constructor(
    private readonly getCatalog: GetContentStudioCatalogService,
    private readonly createPackage: CreateContentPackageService,
    private readonly getPackages: GetContentPackagesService,
    private readonly requestGeneration: RequestStageGenerationService,
    private readonly saveStageContent: SaveStageContentService,
    private readonly completeProductionStage: CompleteProductionStageService,
    private readonly submitReview: SubmitPackageReviewService,
    private readonly approveReviewStage: ApproveReviewStageService,
    private readonly requestStageChanges: RequestStageChangesService,
    private readonly resolveReviewComment: ResolveReviewCommentService,
    private readonly getDashboard: GetContentStudioDashboardService,
    private readonly archivePackage: ArchiveContentPackageService,
    private readonly cancelGeneration: CancelStageGenerationService,
    private readonly latestGeneration: GetLatestStageGenerationService,
  ) {}

  @Get("catalog")
  @FeatureFlag(FeatureFlagKeys.CONTENT_STUDIO)
  @UseGuards(FeatureFlagGuard)
  async catalog(): Promise<ContentStudioCatalogResponseDto> {
    return this.getCatalog.execute();
  }

  @Post("packages")
  @FeatureFlag(FeatureFlagKeys.CONTENT_STUDIO)
  @UseGuards(FeatureFlagGuard)
  async createPackageFromCatalog(
    @Body() dto: CreateContentPackageDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ContentPackageResponseDto> {
    const contentPackage = await this.createPackage.execute(
      dto,
      this.authenticatedUserId(request),
    );
    return ContentPackageResponseDto.fromEntity(contentPackage);
  }

  @Get("packages")
  @FeatureFlag(FeatureFlagKeys.CONTENT_STUDIO)
  @UseGuards(FeatureFlagGuard)
  async packages(
    @Query() query: QueryContentPackagesDto,
  ): Promise<PaginatedContentPackagesResponseDto> {
    const result = await this.getPackages.findAll(query);
    return new PaginatedContentPackagesResponseDto(
      result.data.map((contentPackage) =>
        ContentPackageListItemResponseDto.fromEntity(contentPackage),
      ),
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get("packages/:id")
  @FeatureFlag(FeatureFlagKeys.CONTENT_STUDIO)
  @UseGuards(FeatureFlagGuard)
  async packageDetail(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<ContentPackageResponseDto> {
    const contentPackage = await this.getPackages.findOne(id);
    return ContentPackageResponseDto.fromEntity(contentPackage);
  }

  @Get("dashboard")
  @FeatureFlag(FeatureFlagKeys.CONTENT_STUDIO)
  @UseGuards(FeatureFlagGuard)
  async dashboard(
    @Query() query: QueryContentStudioDashboardDto,
  ): Promise<ContentStudioDashboardResponseDto> {
    return this.getDashboard.execute(query);
  }

  @Post("packages/:packageId/archive")
  @FeatureFlag(FeatureFlagKeys.CONTENT_STUDIO)
  @UseGuards(FeatureFlagGuard)
  async archive(
    @Param("packageId", new ParseUUIDPipe()) packageId: string,
  ): Promise<ContentPackageResponseDto> {
    return ContentPackageResponseDto.fromEntity(
      await this.archivePackage.execute(packageId),
    );
  }

  /** 202: o pedido foi aceito e entra na fila; o resultado vem pelo job. */
  @Post("packages/:packageId/stages/:stageId/generations")
  @HttpCode(HttpStatus.ACCEPTED)
  @FeatureFlag([
    FeatureFlagKeys.CONTENT_STUDIO,
    FeatureFlagKeys.CONTENT_STUDIO_GENERATION,
  ])
  @UseGuards(FeatureFlagGuard)
  async requestStageGeneration(
    @Param("packageId", new ParseUUIDPipe()) packageId: string,
    @Param("stageId", new ParseUUIDPipe()) stageId: string,
    @Body() dto: RequestStageGenerationDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ContentGenerationJobResponseDto> {
    const job = await this.requestGeneration.execute(
      packageId,
      stageId,
      dto,
      this.authenticatedUserId(request),
    );
    return ContentGenerationJobResponseDto.fromEntity(job);
  }

  /** Andamento da última geração da etapa; `204` quando nunca houve. */
  @Get("packages/:packageId/stages/:stageId/generations/latest")
  @FeatureFlag([
    FeatureFlagKeys.CONTENT_STUDIO,
    FeatureFlagKeys.CONTENT_STUDIO_GENERATION,
  ])
  @UseGuards(FeatureFlagGuard)
  async latestStageGeneration(
    @Param("packageId", new ParseUUIDPipe()) packageId: string,
    @Param("stageId", new ParseUUIDPipe()) stageId: string,
  ): Promise<ContentGenerationJobResponseDto | null> {
    const job = await this.latestGeneration.execute(packageId, stageId);
    return job ? ContentGenerationJobResponseDto.fromEntity(job) : null;
  }

  @Delete("packages/:packageId/stages/:stageId/generations")
  @FeatureFlag([
    FeatureFlagKeys.CONTENT_STUDIO,
    FeatureFlagKeys.CONTENT_STUDIO_GENERATION,
  ])
  @UseGuards(FeatureFlagGuard)
  async cancelStageGeneration(
    @Param("packageId", new ParseUUIDPipe()) packageId: string,
    @Param("stageId", new ParseUUIDPipe()) stageId: string,
  ): Promise<ContentGenerationJobResponseDto> {
    return ContentGenerationJobResponseDto.fromEntity(
      await this.cancelGeneration.execute(packageId, stageId),
    );
  }

  @Patch("packages/:packageId/stages/:stageId/content")
  @FeatureFlag(FeatureFlagKeys.CONTENT_STUDIO)
  @UseGuards(FeatureFlagGuard)
  async saveStageStructuredContent(
    @Param("packageId", new ParseUUIDPipe()) packageId: string,
    @Param("stageId", new ParseUUIDPipe()) stageId: string,
    @Body() dto: SaveStageContentDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ContentPackageResponseDto> {
    const contentPackage = await this.saveStageContent.execute(
      packageId,
      stageId,
      dto,
      this.authenticatedUserId(request),
    );
    return ContentPackageResponseDto.fromEntity(contentPackage);
  }

  @Post("packages/:packageId/stages/:stageId/complete-production")
  @FeatureFlag(FeatureFlagKeys.CONTENT_STUDIO)
  @UseGuards(FeatureFlagGuard)
  async completeStageProduction(
    @Param("packageId", new ParseUUIDPipe()) packageId: string,
    @Param("stageId", new ParseUUIDPipe()) stageId: string,
  ): Promise<ContentPackageResponseDto> {
    const contentPackage = await this.completeProductionStage.execute(
      packageId,
      stageId,
    );
    return ContentPackageResponseDto.fromEntity(contentPackage);
  }

  @Post("packages/:packageId/submit-review")
  @FeatureFlag([
    FeatureFlagKeys.CONTENT_STUDIO,
    FeatureFlagKeys.CONTENT_STUDIO_REVIEW,
  ])
  @UseGuards(FeatureFlagGuard)
  async submitPackageReview(
    @Param("packageId", new ParseUUIDPipe()) packageId: string,
  ): Promise<ContentPackageResponseDto> {
    const contentPackage = await this.submitReview.execute(packageId);
    return ContentPackageResponseDto.fromEntity(contentPackage);
  }

  @Post("packages/:packageId/stages/:stageId/approve")
  @FeatureFlag([
    FeatureFlagKeys.CONTENT_STUDIO,
    FeatureFlagKeys.CONTENT_STUDIO_REVIEW,
  ])
  @UseGuards(FeatureFlagGuard)
  async approveStage(
    @Param("packageId", new ParseUUIDPipe()) packageId: string,
    @Param("stageId", new ParseUUIDPipe()) stageId: string,
    @Body() dto: ApproveReviewStageDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ContentPackageResponseDto> {
    const contentPackage = await this.approveReviewStage.execute(
      packageId,
      stageId,
      dto,
      this.authenticatedUserId(request),
    );
    return ContentPackageResponseDto.fromEntity(contentPackage);
  }

  @Post("packages/:packageId/stages/:stageId/request-changes")
  @FeatureFlag([
    FeatureFlagKeys.CONTENT_STUDIO,
    FeatureFlagKeys.CONTENT_STUDIO_REVIEW,
  ])
  @UseGuards(FeatureFlagGuard)
  async requestChanges(
    @Param("packageId", new ParseUUIDPipe()) packageId: string,
    @Param("stageId", new ParseUUIDPipe()) stageId: string,
    @Body() dto: RequestStageChangesDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ContentPackageResponseDto> {
    const contentPackage = await this.requestStageChanges.execute(
      packageId,
      stageId,
      dto,
      this.authenticatedUserId(request),
    );
    return ContentPackageResponseDto.fromEntity(contentPackage);
  }

  @Post("packages/:packageId/review-comments/:commentId/resolve")
  @FeatureFlag([
    FeatureFlagKeys.CONTENT_STUDIO,
    FeatureFlagKeys.CONTENT_STUDIO_REVIEW,
  ])
  @UseGuards(FeatureFlagGuard)
  async resolveComment(
    @Param("packageId", new ParseUUIDPipe()) packageId: string,
    @Param("commentId", new ParseUUIDPipe()) commentId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ContentPackageResponseDto> {
    const contentPackage = await this.resolveReviewComment.execute(
      packageId,
      commentId,
      this.authenticatedUserId(request),
    );
    return ContentPackageResponseDto.fromEntity(contentPackage);
  }

  private authenticatedUserId(request: AuthenticatedRequest): string {
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthenticatedException("Usuário autenticado não encontrado");
    }

    return userId;
  }
}
