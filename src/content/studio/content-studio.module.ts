import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "src/core/auth/auth.module";
import { FeatureFlagsModule } from "src/core/feature-flags/feature-flags.module";

import { ContentStudioController } from "./content-studio.controller";
import { ConfigService } from "@nestjs/config";
import { AiGenerationGateway } from "./ai/ai-generation.gateway";
import { FakeAiGenerationGateway } from "./ai/fake-ai-generation.gateway";
import { OpenAiGenerationGateway } from "./ai/openai-generation.gateway";
import { ContentStudioDashboardRepository } from "./dashboard/content-studio-dashboard.repository";
import { AiManagementController } from "./ai-management/ai-management.controller";
import { GetAiProvidersService } from "./ai-management/services/get-ai-providers.service";
import { ContentAssetEntity } from "./entities/content-asset.entity";
import { ContentGenerationJobEntity } from "./entities/content-generation-job.entity";
import { ContentPackageEntity } from "./entities/content-package.entity";
import { ContentPublicationEntity } from "./entities/content-publication.entity";
import { ContentReviewCommentEntity } from "./entities/content-review-comment.entity";
import { ContentReviewDecisionEntity } from "./entities/content-review-decision.entity";
import { ContentStageEntity } from "./entities/content-stage.entity";
import { ContentTrackEntity } from "./entities/content-track.entity";
import { ContentVersionEntity } from "./entities/content-version.entity";
import { ContentPackagesRepository } from "./repositories/content-packages.repository";
import { ApproveReviewStageService } from "./services/approve-review-stage.service";
import { ArchiveContentPackageService } from "./services/archive-content-package.service";
import { CompleteProductionStageService } from "./services/complete-production-stage.service";
import { CreateContentPackageService } from "./services/create-content-package.service";
import { GetContentStudioCatalogService } from "./services/get-content-studio-catalog.service";
import { GetContentPackagesService } from "./services/get-content-packages.service";
import { GetContentStudioDashboardService } from "./services/get-content-studio-dashboard.service";
import { RequestStageChangesService } from "./services/request-stage-changes.service";
import { ResolveReviewCommentService } from "./services/resolve-review-comment.service";
import { RequestStageGenerationService } from "./services/request-stage-generation.service";
import { SaveStageContentService } from "./services/save-stage-content.service";
import { SubmitPackageReviewService } from "./services/submit-package-review.service";

@Module({
  imports: [
    AuthModule,
    FeatureFlagsModule,
    TypeOrmModule.forFeature([
      ContentAssetEntity,
      ContentGenerationJobEntity,
      ContentPackageEntity,
      ContentPublicationEntity,
      ContentReviewCommentEntity,
      ContentReviewDecisionEntity,
      ContentStageEntity,
      ContentTrackEntity,
      ContentVersionEntity,
    ]),
  ],
  controllers: [ContentStudioController, AiManagementController],
  providers: [
    ContentPackagesRepository,
    ContentStudioDashboardRepository,
    ApproveReviewStageService,
    ArchiveContentPackageService,
    CompleteProductionStageService,
    CreateContentPackageService,
    GetContentStudioCatalogService,
    GetContentPackagesService,
    GetContentStudioDashboardService,
    RequestStageGenerationService,
    RequestStageChangesService,
    ResolveReviewCommentService,
    SaveStageContentService,
    SubmitPackageReviewService,
    GetAiProvidersService,
    OpenAiGenerationGateway,
    {
      // `AI_PROVIDER_MODE=fake` (fora de produção) troca o provedor por um simulado: E2E nunca chama LLM real.
      provide: AiGenerationGateway,
      inject: [ConfigService, OpenAiGenerationGateway],
      useFactory: (
        config: ConfigService,
        openai: OpenAiGenerationGateway,
      ): AiGenerationGateway =>
        config.get<string>("AI_PROVIDER_MODE") === "fake"
          ? new FakeAiGenerationGateway(
              "fake",
              config.get<string>("ENVIRONMENT"),
              Number(config.get<string>("FAKE_AI_QUOTA_TOKENS") ?? 20000),
            )
          : openai,
    },
  ],
  exports: [GetContentStudioCatalogService, GetContentPackagesService],
})
export class ContentStudioModule {}
