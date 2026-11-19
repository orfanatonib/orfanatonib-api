import { Test, TestingModule } from "@nestjs/testing";

import { ApproveReviewStageService } from "./approve-review-stage.service";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentReviewRepository } from "../repositories/content-review.repository";

describe("ApproveReviewStageService", () => {
  let service: ApproveReviewStageService;
  let repository: jest.Mocked<ContentReviewRepository>;

  beforeEach(async () => {
    const mockRepository = {
      approveReviewStage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApproveReviewStageService,
        {
          provide: ContentReviewRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ApproveReviewStageService>(ApproveReviewStageService);
    repository = module.get(ContentReviewRepository);
  });

  it("should approve stage via repository", async () => {
    const expectedPkg = new ContentPackageEntity();
    expectedPkg.id = "pkg-1";

    repository.approveReviewStage.mockResolvedValue(expectedPkg);

    const dto = {
      versionId: "version-1",
      lockVersion: 3,
      contentChecksum: "checksum",
    };
    const result = await service.execute("pkg-1", "stage-1", dto, "reviewer-1");

    expect(result).toBe(expectedPkg);
    expect(repository.approveReviewStage).toHaveBeenCalledWith({
      packageId: "pkg-1",
      stageId: "stage-1",
      versionId: "version-1",
      lockVersion: 3,
      contentChecksum: "checksum",
      reviewerId: "reviewer-1",
    });
  });
});
