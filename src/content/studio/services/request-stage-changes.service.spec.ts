import { Test, TestingModule } from "@nestjs/testing";

import { RequestStageChangesService } from "./request-stage-changes.service";
import { RequestStageChangesDto } from "../dto/request-stage-changes.dto";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentReviewRepository } from "../repositories/content-review.repository";

describe("RequestStageChangesService", () => {
  let service: RequestStageChangesService;
  let repository: jest.Mocked<ContentReviewRepository>;

  beforeEach(async () => {
    const mockRepository = {
      requestStageChanges: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestStageChangesService,
        {
          provide: ContentReviewRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RequestStageChangesService>(
      RequestStageChangesService,
    );
    repository = module.get(ContentReviewRepository);
  });

  it("should request stage changes via repository", async () => {
    const dto: RequestStageChangesDto = {
      versionId: "version-1",
      lockVersion: 3,
      contentChecksum: "checksum",
      message: " Adequar linguagem ",
      blockKey: "block-1 ",
    };

    const expectedPkg = new ContentPackageEntity();
    expectedPkg.id = "pkg-1";

    repository.requestStageChanges.mockResolvedValue(expectedPkg);

    const result = await service.execute("pkg-1", "stage-1", dto, "user-rev-1");

    expect(result).toBe(expectedPkg);
    expect(repository.requestStageChanges).toHaveBeenCalledWith({
      packageId: "pkg-1",
      stageId: "stage-1",
      message: "Adequar linguagem",
      blockKey: "block-1",
      authorId: "user-rev-1",
      versionId: "version-1",
      lockVersion: 3,
      contentChecksum: "checksum",
    });
  });
});
