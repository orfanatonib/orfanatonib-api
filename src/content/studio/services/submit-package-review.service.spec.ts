import { Test, TestingModule } from "@nestjs/testing";

import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentAudience } from "../enums/content-audience.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";
import { StudioExportService } from "../export/studio-export.service";
import { ContentReviewRepository } from "../repositories/content-review.repository";
import { SubmitPackageReviewService } from "./submit-package-review.service";

const stage = (id: string, status: ContentStageStatus) => ({ id, status });
const track = (audience: ContentAudience, statuses: ContentStageStatus[]) => ({
  audience,
  stages: statuses.map((status, index) =>
    stage(`${audience}-${index}`, status),
  ),
});

describe("SubmitPackageReviewService", () => {
  let service: SubmitPackageReviewService;
  let repository: { submitPackageForReview: jest.Mock };
  let exportsService: { pregenerateStagePdfs: jest.Mock };

  beforeEach(async () => {
    repository = { submitPackageForReview: jest.fn() };
    exportsService = {
      pregenerateStagePdfs: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitPackageReviewService,
        { provide: ContentReviewRepository, useValue: repository },
        { provide: StudioExportService, useValue: exportsService },
      ],
    }).compile();
    service = module.get(SubmitPackageReviewService);
  });

  it("envia para revisão via repositório e devolve o pacote", async () => {
    const expected = new ContentPackageEntity();
    expected.id = "pkg-1";
    repository.submitPackageForReview.mockResolvedValue(expected);

    const result = await service.execute("pkg-1", undefined, "producer-1");

    expect(result).toBe(expected);
    expect(repository.submitPackageForReview).toHaveBeenCalledWith(
      "pkg-1",
      undefined,
      "producer-1",
    );
  });

  it("pré-gera o PDF só das etapas enviadas (IN_REVIEW) das categorias escolhidas, para o revisor abrir um PDF já pronto", async () => {
    const S = ContentStageStatus;
    repository.submitPackageForReview.mockResolvedValue({
      id: "pkg-1",
      tracks: [
        track(ContentAudience.BABY, [S.IN_REVIEW, S.IN_REVIEW]),
        track(ContentAudience.CHILD, [S.IN_REVIEW, S.APPROVED]),
        track(ContentAudience.TEEN, [S.PRODUCER_APPROVED, S.DRAFT]),
      ],
    });

    await service.execute("pkg-1", [ContentAudience.CHILD]);

    expect(exportsService.pregenerateStagePdfs).toHaveBeenCalledWith("pkg-1", [
      "CHILD-0",
    ]);
  });

  it("sem lista de categorias, pré-gera as de todas as categorias enviadas", async () => {
    const S = ContentStageStatus;
    repository.submitPackageForReview.mockResolvedValue({
      id: "pkg-1",
      tracks: [
        track(ContentAudience.BABY, [S.IN_REVIEW]),
        track(ContentAudience.CHILD, [S.IN_REVIEW]),
      ],
    });
    await service.execute("pkg-1");
    expect(exportsService.pregenerateStagePdfs).toHaveBeenCalledWith("pkg-1", [
      "BABY-0",
      "CHILD-0",
    ]);
  });
});
