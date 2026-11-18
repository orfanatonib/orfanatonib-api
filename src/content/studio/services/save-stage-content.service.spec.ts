import { Test, TestingModule } from "@nestjs/testing";

import { SaveStageContentService } from "./save-stage-content.service";
import { SaveStageContentDto } from "../dto/save-stage-content.dto";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentPackagesRepository } from "../repositories/content-packages.repository";

describe("SaveStageContentService", () => {
  let service: SaveStageContentService;
  let repository: jest.Mocked<ContentPackagesRepository>;

  beforeEach(async () => {
    const mockRepository = {
      saveStageContent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaveStageContentService,
        {
          provide: ContentPackagesRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SaveStageContentService>(SaveStageContentService);
    repository = module.get(ContentPackagesRepository);
  });

  it("should save structured stage content", async () => {
    const dto: SaveStageContentDto = {
      structuredContent: { title: "Lição 1", body: "Texto da lição" },
      templateVersion: "1.0.0",
    };

    const expectedPkg = new ContentPackageEntity();
    expectedPkg.id = "pkg-1";

    repository.saveStageContent.mockResolvedValue(expectedPkg);

    const result = await service.execute("pkg-1", "stage-1", dto, "user-1");

    expect(result).toBe(expectedPkg);
    expect(repository.saveStageContent).toHaveBeenCalledWith(
      expect.objectContaining({
        packageId: "pkg-1",
        stageId: "stage-1",
        structuredContent: dto.structuredContent,
        contentChecksum: expect.stringMatching(/^[a-f0-9]{64}$/),
        templateVersion: dto.templateVersion,
        generationSnapshot: null,
        createdById: "user-1",
      }),
    );
  });
});
