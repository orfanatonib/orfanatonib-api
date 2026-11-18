import { Test, TestingModule } from "@nestjs/testing";

import { CreateContentPackageService } from "./create-content-package.service";
import { CreateContentPackageDto } from "../dto/create-content-package.dto";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentPackagesRepository } from "../repositories/content-packages.repository";

describe("CreateContentPackageService", () => {
  let service: CreateContentPackageService;
  let repository: jest.Mocked<ContentPackagesRepository>;

  beforeEach(async () => {
    const mockRepository = {
      createWithCatalog: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateContentPackageService,
        {
          provide: ContentPackagesRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CreateContentPackageService>(
      CreateContentPackageService,
    );
    repository = module.get(ContentPackagesRepository);
  });

  it("should create content package using repository and default catalog", async () => {
    const dto: CreateContentPackageDto = {
      theme: "O Amor de Deus",
      biblicalReferences: "João 3:16",
      canonicalObjective: "Ensinar sobre o amor supremo",
      canonicalNotes: "Nota adicional",
    };

    const expectedPackage = new ContentPackageEntity();
    expectedPackage.id = "pkg-123";
    expectedPackage.theme = dto.theme;

    repository.createWithCatalog.mockResolvedValue(expectedPackage);

    const result = await service.execute(dto, "user-admin-1");

    expect(result).toBe(expectedPackage);
    expect(repository.createWithCatalog).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: dto.theme,
        biblicalReferences: dto.biblicalReferences,
        canonicalObjective: dto.canonicalObjective,
        canonicalNotes: dto.canonicalNotes,
        createdById: "user-admin-1",
      }),
    );
  });

  it("rejects personal information before persisting a package", async () => {
    await expect(
      service.execute(
        {
          theme: "Esperança",
          biblicalReferences: "Salmos 23",
          canonicalObjective: "Acolhimento pastoral",
          canonicalNotes: "Nome da criança acolhida: Maria",
        },
        "user-admin-1",
      ),
    ).rejects.toThrow("não pode incluir dados pessoais");

    expect(repository.createWithCatalog).not.toHaveBeenCalled();
  });
});
