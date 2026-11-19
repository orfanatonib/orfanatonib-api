import { Test, TestingModule } from "@nestjs/testing";

import { CompleteProductionStageService } from "./complete-production-stage.service";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentStageContentRepository } from "../repositories/content-stage-content.repository";

describe("CompleteProductionStageService", () => {
  let service: CompleteProductionStageService;
  let repository: jest.Mocked<ContentStageContentRepository>;

  beforeEach(async () => {
    const mockRepository = {
      completeProductionStage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompleteProductionStageService,
        {
          provide: ContentStageContentRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CompleteProductionStageService>(
      CompleteProductionStageService,
    );
    repository = module.get(ContentStageContentRepository);
  });

  it("should complete stage production via repository", async () => {
    const expectedPkg = new ContentPackageEntity();
    expectedPkg.id = "pkg-1";

    repository.completeProductionStage.mockResolvedValue(expectedPkg);

    const result = await service.execute("pkg-1", "stage-1");

    expect(result).toBe(expectedPkg);
    expect(repository.completeProductionStage).toHaveBeenCalledWith({
      packageId: "pkg-1",
      stageId: "stage-1",
    });
  });
});
