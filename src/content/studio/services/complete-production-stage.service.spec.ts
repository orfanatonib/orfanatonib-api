import { Test, TestingModule } from "@nestjs/testing";

import { CompleteProductionStageService } from "./complete-production-stage.service";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentPackagesRepository } from "../repositories/content-packages.repository";

describe("CompleteProductionStageService", () => {
  let service: CompleteProductionStageService;
  let repository: jest.Mocked<ContentPackagesRepository>;

  beforeEach(async () => {
    const mockRepository = {
      completeProductionStage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompleteProductionStageService,
        {
          provide: ContentPackagesRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CompleteProductionStageService>(
      CompleteProductionStageService,
    );
    repository = module.get(ContentPackagesRepository);
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
