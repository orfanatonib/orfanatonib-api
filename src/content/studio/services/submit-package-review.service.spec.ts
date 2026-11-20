import { Test, TestingModule } from "@nestjs/testing";

import { SubmitPackageReviewService } from "./submit-package-review.service";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentReviewRepository } from "../repositories/content-review.repository";

describe("SubmitPackageReviewService", () => {
  let service: SubmitPackageReviewService;
  let repository: jest.Mocked<ContentReviewRepository>;

  beforeEach(async () => {
    const mockRepository = {
      submitPackageForReview: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitPackageReviewService,
        {
          provide: ContentReviewRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SubmitPackageReviewService>(
      SubmitPackageReviewService,
    );
    repository = module.get(ContentReviewRepository);
  });

  it("should submit package for review via repository", async () => {
    const expectedPkg = new ContentPackageEntity();
    expectedPkg.id = "pkg-1";

    repository.submitPackageForReview.mockResolvedValue(expectedPkg);

    const result = await service.execute("pkg-1");

    expect(result).toBe(expectedPkg);
    expect(repository.submitPackageForReview).toHaveBeenCalledWith(
      "pkg-1",
      undefined,
    );
  });
});
