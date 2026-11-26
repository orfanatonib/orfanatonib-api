import { Module } from "@nestjs/common";
import { redisNamespace } from "../../shared/providers/ai-queue/namespace.utils";
import { TypeOrmModule } from "@nestjs/typeorm";

import { VisitMaterialsPageModule } from "src/content/page/visit-material-page/visit-material-page.module";
import { InboxNotificationModule } from "src/communication/inbox/inbox-notification.module";
import { AuthModule } from "src/core/auth/auth.module";
import { FeatureFlagsModule } from "src/core/feature-flags/feature-flags.module";

import { StudioNotificationService } from "./services/studio-notification.service";
import { ContentStudioController } from "./content-studio.controller";
import { AiJobQueuePort } from "./queue/ai-job-queue.port";
import { AiUsageRepository } from "./ai-management/ai-usage.repository";
import { GetAiUsageService } from "./ai-management/services/get-ai-usage.service";
import { ContentStudioGenerationStreamController } from "./content-studio-generation-stream.controller";
import { ContentStudioActivityController } from "./content-studio-activity.controller";
import { GenerationActivityRepository } from "./repositories/generation-activity.repository";
import { GetGenerationActivityService } from "./services/get-generation-activity.service";
import { GenerationStreamRepository } from "./repositories/generation-stream.repository";
import { GenerationStreamService } from "./services/generation-stream.service";
import { ContentStudioPromptPreferencesController } from "./content-studio-prompt-preferences.controller";
import { ContentPromptPreferenceEntity } from "./entities/content-prompt-preference.entity";
import { ListPromptPreferencesService } from "./prompt-preferences/services/list-prompt-preferences.service";
import { ResetPromptPreferenceService } from "./prompt-preferences/services/reset-prompt-preference.service";
import { SavePromptPreferenceService } from "./prompt-preferences/services/save-prompt-preference.service";
import { ContentPromptPreferenceRepository } from "./repositories/content-prompt-preference.repository";
import { BullMqAiJobQueue } from "./queue/bullmq-ai-job-queue";
import { InMemoryAiJobQueue } from "./queue/in-memory-ai-job-queue";
import { GetLatestStageGenerationService } from "./services/get-latest-stage-generation.service";
import { CancelStageGenerationService } from "./services/cancel-stage-generation.service";
import { GenerationWorkerService } from "./services/generation-worker.service";
import { ProcessStageImagesService } from "./services/process-stage-images.service";
import { RequestStageImagesService } from "./services/request-stage-images.service";
import { GetStageImagesService } from "./services/get-stage-images.service";
import { ContentAssetRepository } from "./repositories/content-asset.repository";
import { ProcessGenerationJobService } from "./services/process-generation-job.service";
import { ConfigService } from "@nestjs/config";
import { AiGenerationGateway } from "./ai/ai-generation.gateway";
import { FakeAiGenerationGateway } from "./ai/fake-ai-generation.gateway";
import { GeminiGenerationGateway } from "./ai/gemini-generation.gateway";
import { ContentStudioPublicationController } from "./content-studio-publication.controller";
import { ContentPublicationRepository } from "./repositories/content-publication.repository";
import { PublishContentPackageService } from "./services/publish-content-package.service";
import { GetContentPublicationService } from "./services/get-content-publication.service";
import { GetPublicationPageService } from "./services/get-publication-page.service";
import { CreatePublicationPageService } from "./services/create-publication-page.service";
import { BuildPublicationDocumentsService } from "./services/build-publication-documents.service";
import { ContentStudioExportController } from "./content-studio-export.controller";
import { PdfLibreOfficeService } from "./export/pdf-libreoffice.service";
import { StudioDocxService } from "./export/studio-docx.service";
import { StudioExportService } from "./export/studio-export.service";
import { ConfiguredAiGenerationGateway } from "./ai/configured-ai-generation.gateway";
import { StudioProviderOverrides } from "./ai/provider-overrides.service";
import { AiProviderSettingsModule } from "../ai-lessons/ai-provider-settings.module";
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
import { ContentGenerationRepository } from "./repositories/content-generation.repository";
import { ContentReviewRepository } from "./repositories/content-review.repository";
import { ContentStageContentRepository } from "./repositories/content-stage-content.repository";
import { ApproveReviewStageService } from "./services/approve-review-stage.service";
import { ArchiveContentPackageService } from "./services/archive-content-package.service";
import { CompleteProductionStageService } from "./services/complete-production-stage.service";
import { CreateContentPackageService } from "./services/create-content-package.service";
import { GeneratePackageCoverService } from "./services/generate-package-cover.service";
import { GetContentStudioCatalogService } from "./services/get-content-studio-catalog.service";
import { GetContentPackagesService } from "./services/get-content-packages.service";
import { GetContentStudioDashboardService } from "./services/get-content-studio-dashboard.service";
import { RequestStageChangesService } from "./services/request-stage-changes.service";
import { ResolveReviewCommentService } from "./services/resolve-review-comment.service";
import { RequestStageGenerationService } from "./services/request-stage-generation.service";
import { SaveStageContentService } from "./services/save-stage-content.service";
import { SubmitPackageReviewService } from "./services/submit-package-review.service";

/** Cota simulada: 4 públicos × 5 etapas são 20 pedidos de ~2 mil tokens por material; o E2E cria vários. */
const FAKE_AI_DEFAULT_QUOTA_TOKENS = 500_000;

@Module({
  imports: [
    AuthModule,
    FeatureFlagsModule,
    AiProviderSettingsModule,
    VisitMaterialsPageModule,
    InboxNotificationModule,
    TypeOrmModule.forFeature([
      ContentAssetEntity,
      ContentGenerationJobEntity,
      ContentPackageEntity,
      ContentPublicationEntity,
      ContentReviewCommentEntity,
      ContentPromptPreferenceEntity,
      ContentReviewDecisionEntity,
      ContentStageEntity,
      ContentTrackEntity,
      ContentVersionEntity,
    ]),
  ],
  controllers: [
    ContentStudioController,
    AiManagementController,
    ContentStudioExportController,
    ContentStudioPublicationController,
    ContentStudioGenerationStreamController,
    ContentStudioActivityController,
    ContentStudioPromptPreferencesController,
  ],
  providers: [
    ContentPackagesRepository,
    ContentGenerationRepository,
    ContentStageContentRepository,
    ContentReviewRepository,
    ContentPublicationRepository,
    PublishContentPackageService,
    GetContentPublicationService,
    GetPublicationPageService,
    CreatePublicationPageService,
    BuildPublicationDocumentsService,
    GenerationStreamRepository,
    GenerationActivityRepository,
    GetGenerationActivityService,
    ContentPromptPreferenceRepository,
    ListPromptPreferencesService,
    SavePromptPreferenceService,
    ResetPromptPreferenceService,
    GenerationStreamService,
    AiUsageRepository,
    GetAiUsageService,
    ContentStudioDashboardRepository,
    ApproveReviewStageService,
    ArchiveContentPackageService,
    CompleteProductionStageService,
    CreateContentPackageService,
    GetContentStudioCatalogService,
    GetContentPackagesService,
    GeneratePackageCoverService,
    GetContentStudioDashboardService,
    RequestStageGenerationService,
    CancelStageGenerationService,
    GetLatestStageGenerationService,
    ProcessGenerationJobService,
    ProcessStageImagesService,
    RequestStageImagesService,
    GetStageImagesService,
    ContentAssetRepository,
    GenerationWorkerService,
    // Fila em processo (id do job apenas; o banco é a verdade). Um adaptador BullMQ/Redis entra por esta porta.
    {
      // Redis (BullMQ) quando `REDIS_URL` existe — fila compartilhada entre instâncias e jobs que sobrevivem a deploy.
      // Sem Redis (ou `CS_QUEUE_DRIVER=memory`) a fila é em processo: o reconciliador recupera o que ficou para trás.
      provide: AiJobQueuePort,
      inject: [ConfigService],
      useFactory: (config: ConfigService): AiJobQueuePort => {
        const redisUrl = config.get<string>("REDIS_URL")?.trim();
        const driver = (
          config.get<string>("CS_QUEUE_DRIVER") ?? ""
        ).toLowerCase();
        return redisUrl && driver !== "memory"
          ? new BullMqAiJobQueue({
              redisUrl,
              prefix: `${redisNamespace((key) => config.get<string>(key))}:studio`,
            })
          : new InMemoryAiJobQueue();
      },
    },
    StudioNotificationService,
    RequestStageChangesService,
    ResolveReviewCommentService,
    SaveStageContentService,
    SubmitPackageReviewService,
    GetAiProvidersService,
    OpenAiGenerationGateway,
    GeminiGenerationGateway,
    StudioProviderOverrides,
    StudioDocxService,
    PdfLibreOfficeService,
    StudioExportService,
    {
      // Escolhe o provedor a cada chamada: simulado (`AI_PROVIDER_MODE=fake`, fora de produção), o ativo no
      // painel "Provedores e Modelos IA" (se tiver chave salva) ou o do ambiente. Ver `ConfiguredAiGenerationGateway`.
      provide: AiGenerationGateway,
      inject: [
        ConfigService,
        StudioProviderOverrides,
        OpenAiGenerationGateway,
        GeminiGenerationGateway,
      ],
      useFactory: (
        config: ConfigService,
        overrides: StudioProviderOverrides,
        openai: OpenAiGenerationGateway,
        gemini: GeminiGenerationGateway,
      ): AiGenerationGateway =>
        new ConfiguredAiGenerationGateway(
          config.get<string>("CONTENT_STUDIO_AI_PROVIDER"),
          overrides,
          openai,
          gemini,
          config.get<string>("AI_PROVIDER_MODE") === "fake"
            ? new FakeAiGenerationGateway(
                "fake",
                config.get<string>("ENVIRONMENT"),
                Number(
                  config.get<string>("FAKE_AI_QUOTA_TOKENS") ??
                    FAKE_AI_DEFAULT_QUOTA_TOKENS,
                ),
              )
            : undefined,
        ),
    },
  ],
  exports: [GetContentStudioCatalogService, GetContentPackagesService],
})
export class ContentStudioModule {}
