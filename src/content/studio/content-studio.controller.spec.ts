import { Test, TestingModule } from "@nestjs/testing";

import { UnauthenticatedException } from "src/common/exceptions";
import { AuthenticatedRequest } from "src/core/auth/auth.types";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";

import { ContentStudioController } from "./content-studio.controller";
import { AiGenerationCapability } from "./ai/enums/ai-generation-capability.enum";
import { CreateContentPackageDto } from "./dto/create-content-package.dto";
import { QueryContentPackagesDto } from "./dto/query-content-packages.dto";
import { RequestStageChangesDto } from "./dto/request-stage-changes.dto";
import { RequestStageGenerationDto } from "./dto/request-stage-generation.dto";
import { SaveStageContentDto } from "./dto/save-stage-content.dto";
import { ContentGenerationJobEntity } from "./entities/content-generation-job.entity";
import { ContentPackageEntity } from "./entities/content-package.entity";
import { ContentPackageStatus } from "./enums/content-package-status.enum";
import { ApproveReviewStageService } from "./services/approve-review-stage.service";
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
import { GetLatestStageGenerationService } from "./services/get-latest-stage-generation.service";
import { CancelStageGenerationService } from "./services/cancel-stage-generation.service";
import { ArchiveContentPackageService } from "./services/archive-content-package.service";

describe("ContentStudioController", () => {
  let controller: ContentStudioController;
  let mockGetCatalog: jest.Mocked<GetContentStudioCatalogService>;
  let mockCreatePackage: jest.Mocked<CreateContentPackageService>;
  let mockGetPackages: jest.Mocked<GetContentPackagesService>;
  let mockRequestGeneration: jest.Mocked<RequestStageGenerationService>;
  let mockSaveStageContent: jest.Mocked<SaveStageContentService>;
  let mockCompleteProductionStage: jest.Mocked<CompleteProductionStageService>;
  let mockSubmitReview: jest.Mocked<SubmitPackageReviewService>;
  let mockApproveReviewStage: jest.Mocked<ApproveReviewStageService>;
  let mockRequestStageChanges: jest.Mocked<RequestStageChangesService>;
  let mockResolveReviewComment: jest.Mocked<ResolveReviewCommentService>;

  beforeEach(async () => {
    mockGetCatalog = { execute: jest.fn() } as any;
    mockCreatePackage = { execute: jest.fn() } as any;
    mockGetPackages = { findAll: jest.fn(), findOne: jest.fn() } as any;
    mockRequestGeneration = { execute: jest.fn() } as any;
    mockSaveStageContent = { execute: jest.fn() } as any;
    mockCompleteProductionStage = { execute: jest.fn() } as any;
    mockSubmitReview = { execute: jest.fn() } as any;
    mockApproveReviewStage = { execute: jest.fn() } as any;
    mockRequestStageChanges = { execute: jest.fn() } as any;
    mockResolveReviewComment = { execute: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentStudioController],
      providers: [
        { provide: GetContentStudioCatalogService, useValue: mockGetCatalog },
        { provide: CreateContentPackageService, useValue: mockCreatePackage },
        { provide: GetContentPackagesService, useValue: mockGetPackages },
        {
          provide: RequestStageGenerationService,
          useValue: mockRequestGeneration,
        },
        { provide: SaveStageContentService, useValue: mockSaveStageContent },
        {
          provide: CompleteProductionStageService,
          useValue: mockCompleteProductionStage,
        },
        { provide: SubmitPackageReviewService, useValue: mockSubmitReview },
        {
          provide: ApproveReviewStageService,
          useValue: mockApproveReviewStage,
        },
        {
          provide: RequestStageChangesService,
          useValue: mockRequestStageChanges,
        },
        {
          provide: ResolveReviewCommentService,
          useValue: mockResolveReviewComment,
        },
        {
          provide: GetContentStudioDashboardService,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ArchiveContentPackageService,
          useValue: { execute: jest.fn() },
        },
        {
          provide: CancelStageGenerationService,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetLatestStageGenerationService,
          useValue: { execute: jest.fn() },
        },
      ],
    })
      .overrideGuard(FeatureFlagGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ContentStudioController>(ContentStudioController);
  });

  const mockReq = (userId?: string): AuthenticatedRequest =>
    ({
      user: userId ? { userId } : undefined,
    }) as any;

  const samplePackage = (): ContentPackageEntity => {
    const pkg = new ContentPackageEntity();
    pkg.id = "c3f8f118-20ab-48d6-96a2-9476b70125a4";
    pkg.theme = "Amor de Deus";
    pkg.biblicalReferences = "João 3:16";
    pkg.canonicalObjective = "Ensinar sobre o amor supremo";
    pkg.canonicalNotes = null;
    pkg.status = ContentPackageStatus.DRAFT;
    pkg.tracks = [];
    pkg.createdAt = new Date();
    pkg.updatedAt = new Date();
    return pkg;
  };

  it("should return catalog", async () => {
    const catalogData = {
      version: "1.0.0",
      allAudiencesRequired: true,
      audiences: [],
      capabilities: {
        generation: false,
        review: false,
        publication: false,
        providerAdministration: false,
      },
    };
    mockGetCatalog.execute.mockResolvedValue(catalogData);

    const res = await controller.catalog();
    expect(res).toBe(catalogData);
  });

  it("should create package when user is authenticated", async () => {
    const dto: CreateContentPackageDto = {
      theme: "Amor de Deus",
      biblicalReferences: "João 3:16",
      canonicalObjective: "Ensinar sobre o amor supremo",
    };
    const pkg = samplePackage();
    mockCreatePackage.execute.mockResolvedValue(pkg);

    const res = await controller.createPackageFromCatalog(
      dto,
      mockReq("user-1"),
    );
    expect(res.id).toBe(pkg.id);
    expect(mockCreatePackage.execute).toHaveBeenCalledWith(dto, "user-1");
  });

  it("should throw UnauthenticatedException when user id missing", async () => {
    const dto: CreateContentPackageDto = {
      theme: "Amor de Deus",
      biblicalReferences: "João 3:16",
      canonicalObjective: "Ensinar sobre o amor supremo",
    };

    await expect(
      controller.createPackageFromCatalog(dto, mockReq()),
    ).rejects.toThrow(UnauthenticatedException);
  });

  it("should list packages", async () => {
    const query: QueryContentPackagesDto = { page: 1, limit: 10 };
    mockGetPackages.findAll.mockResolvedValue({
      data: [samplePackage()],
      total: 1,
      page: 1,
      limit: 10,
    });

    const res = await controller.packages(query);
    expect(res.total).toBe(1);
    expect(res.data).toHaveLength(1);
  });

  it("should return package detail", async () => {
    const pkg = samplePackage();
    mockGetPackages.findOne.mockResolvedValue(pkg);

    const res = await controller.packageDetail(
      "c3f8f118-20ab-48d6-96a2-9476b70125a4",
    );
    expect(res.id).toBe(pkg.id);
  });

  it("should request stage generation", async () => {
    const dto: RequestStageGenerationDto = {
      idempotencyKey: "key-1",
      capability: AiGenerationCapability.TEXT_STRUCTURED,
    };
    const job = new ContentGenerationJobEntity();
    job.id = "job-1";
    job.stageId = "stage-1";
    job.capability = AiGenerationCapability.TEXT_STRUCTURED;

    mockRequestGeneration.execute.mockResolvedValue(job);

    const res = await controller.requestStageGeneration(
      "c3f8f118-20ab-48d6-96a2-9476b70125a4",
      "550e8400-e29b-41d4-a716-446655440000",
      dto,
      mockReq("user-1"),
    );

    expect(res.id).toBe("job-1");
  });

  it("should save stage content", async () => {
    const dto: SaveStageContentDto = {
      structuredContent: { text: "Conteúdo" },
      templateVersion: "1.0.0",
    };
    const pkg = samplePackage();
    mockSaveStageContent.execute.mockResolvedValue(pkg);

    const res = await controller.saveStageStructuredContent(
      "c3f8f118-20ab-48d6-96a2-9476b70125a4",
      "550e8400-e29b-41d4-a716-446655440000",
      dto,
      mockReq("user-1"),
    );

    expect(res.id).toBe(pkg.id);
  });

  it("should complete stage production", async () => {
    const pkg = samplePackage();
    mockCompleteProductionStage.execute.mockResolvedValue(pkg);

    const res = await controller.completeStageProduction(
      "c3f8f118-20ab-48d6-96a2-9476b70125a4",
      "550e8400-e29b-41d4-a716-446655440000",
    );

    expect(res.id).toBe(pkg.id);
  });

  it("should submit package review", async () => {
    const pkg = samplePackage();
    mockSubmitReview.execute.mockResolvedValue(pkg);

    const res = await controller.submitPackageReview(
      "c3f8f118-20ab-48d6-96a2-9476b70125a4",
    );
    expect(res.id).toBe(pkg.id);
  });

  it("should approve stage", async () => {
    const pkg = samplePackage();
    mockApproveReviewStage.execute.mockResolvedValue(pkg);

    const res = await controller.approveStage(
      "c3f8f118-20ab-48d6-96a2-9476b70125a4",
      "550e8400-e29b-41d4-a716-446655440000",
      {
        versionId: "550e8400-e29b-41d4-a716-446655440001",
        lockVersion: 1,
        contentChecksum: "a".repeat(64),
      },
      mockReq("reviewer-1"),
    );

    expect(res.id).toBe(pkg.id);
  });

  it("should request stage changes", async () => {
    const dto: RequestStageChangesDto = {
      versionId: "550e8400-e29b-41d4-a716-446655440001",
      lockVersion: 1,
      contentChecksum: "a".repeat(64),
      message: "Ajustar texto",
    };
    const pkg = samplePackage();
    mockRequestStageChanges.execute.mockResolvedValue(pkg);

    const res = await controller.requestChanges(
      "c3f8f118-20ab-48d6-96a2-9476b70125a4",
      "550e8400-e29b-41d4-a716-446655440000",
      dto,
      mockReq("user-1"),
    );

    expect(res.id).toBe(pkg.id);
  });

  it("should resolve a review comment as the authenticated reviewer", async () => {
    const pkg = samplePackage();
    mockResolveReviewComment.execute.mockResolvedValue(pkg);

    const res = await controller.resolveComment(
      "c3f8f118-20ab-48d6-96a2-9476b70125a4",
      "550e8400-e29b-41d4-a716-446655440002",
      mockReq("reviewer-1"),
    );

    expect(res.id).toBe(pkg.id);
    expect(mockResolveReviewComment.execute).toHaveBeenCalledWith(
      pkg.id,
      "550e8400-e29b-41d4-a716-446655440002",
      "reviewer-1",
    );
  });
});
