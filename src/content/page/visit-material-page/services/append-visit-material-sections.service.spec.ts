import { Test } from "@nestjs/testing";
import { EntityManager } from "typeorm";

import { ProcessException, RuleException } from "src/common/exceptions";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";

import { AppendVisitMaterialSectionsDto } from "../dto/append-visit-material-sections.dto";
import { VisitMaterialSectionInputDto } from "../dto/visit-material-section.dto";
import { VisitMaterialSectionEntity } from "../entities/visit-material-section.entity";
import { VisitMaterialCategory } from "../enums/visit-material-category.enum";
import { VisitMaterialsPageRepository } from "../repositories/visit-material-page.repository";
import { AppendVisitMaterialSectionsService } from "./append-visit-material-sections.service";
import { GetVisitMaterialPageService } from "./get-visit-material-page.service";
import { VisitMaterialMediaService } from "./visit-material-media.service";
import { VisitMaterialSectionsService } from "./visit-material-sections.service";

const section = (category: VisitMaterialCategory) =>
  Object.assign(new VisitMaterialSectionInputDto(), { category });

const dto = (
  categories: VisitMaterialCategory[],
  documents?: AppendVisitMaterialSectionsDto["documents"],
) =>
  Object.assign(new AppendVisitMaterialSectionsDto(), {
    sections: categories.map(section),
    documents,
  });

const stored = (category: VisitMaterialCategory) => ({
  section: Object.assign(new VisitMaterialSectionEntity(), {
    id: `section-${category}`,
    pageId: "page-1",
    category,
  }),
  media: [],
});

describe("AppendVisitMaterialSectionsService", () => {
  const manager = {} as EntityManager;
  const page = { id: "page-1" };
  const repository = { runInTransaction: jest.fn() };
  const getService = { findEntityOrFail: jest.fn(), toResponse: jest.fn() };
  const mediaService = { toPolymorphicItems: jest.fn() };
  const sectionsService = {
    prepare: jest.fn(),
    loadForPage: jest.fn(),
    createAll: jest.fn(),
  };
  const processor = { processMediaItemsPolymorphic: jest.fn() };
  const s3 = { upload: jest.fn(), delete: jest.fn() };
  let service: AppendVisitMaterialSectionsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AppendVisitMaterialSectionsService,
        { provide: VisitMaterialsPageRepository, useValue: repository },
        { provide: GetVisitMaterialPageService, useValue: getService },
        { provide: VisitMaterialMediaService, useValue: mediaService },
        { provide: VisitMaterialSectionsService, useValue: sectionsService },
        { provide: MediaItemProcessor, useValue: processor },
        { provide: AwsS3Service, useValue: s3 },
      ],
    }).compile();
    service = moduleRef.get(AppendVisitMaterialSectionsService);

    getService.findEntityOrFail.mockResolvedValue(page);
    getService.toResponse.mockResolvedValue({ id: "page-1" });
    mediaService.toPolymorphicItems.mockReturnValue([]);
    sectionsService.prepare.mockImplementation(
      (sections: VisitMaterialSectionInputDto[]) =>
        sections.map((input) => ({ input, mediaInputs: [] })),
    );
    sectionsService.loadForPage.mockResolvedValue([]);
    sectionsService.createAll.mockResolvedValue([]);
    processor.processMediaItemsPolymorphic.mockResolvedValue([]);
    repository.runInTransaction.mockImplementation(
      (work: (m: EntityManager) => Promise<unknown>) => work(manager),
    );
  });

  it("acrescenta a seção da categoria nova, em uma transação, sem tocar nas existentes", async () => {
    sectionsService.loadForPage.mockResolvedValue([
      stored(VisitMaterialCategory.BABY),
    ]);

    const result = await service.execute(
      "page-1",
      dto([VisitMaterialCategory.CHILD]),
      {},
    );

    expect(result).toEqual({ id: "page-1" });
    expect(repository.runInTransaction).toHaveBeenCalledTimes(1);
    expect(sectionsService.createAll).toHaveBeenCalledTimes(1);
    const created = sectionsService.createAll.mock.calls[0] as [
      string,
      Array<{ input: VisitMaterialSectionInputDto }>,
      unknown,
      EntityManager,
    ];
    expect(created[0]).toBe("page-1");
    expect(created[1].map((item) => item.input.category)).toEqual([
      VisitMaterialCategory.CHILD,
    ]);
    expect(created[3]).toBe(manager);
  });

  it("recusa a categoria que a página já tem, sem gravar nada", async () => {
    sectionsService.loadForPage.mockResolvedValue([
      stored(VisitMaterialCategory.BABY),
    ]);

    await expect(
      service.execute(
        "page-1",
        dto([VisitMaterialCategory.CHILD, VisitMaterialCategory.BABY]),
        {},
      ),
    ).rejects.toBeInstanceOf(RuleException);
    expect(repository.runInTransaction).not.toHaveBeenCalled();
    expect(sectionsService.createAll).not.toHaveBeenCalled();
  });

  it("categoria repetida no mesmo pedido falha antes de gravar (a validação vem do serviço de seções)", async () => {
    sectionsService.prepare.mockImplementation(() => {
      throw new RuleException("duplicada");
    });

    await expect(
      service.execute(
        "page-1",
        dto([VisitMaterialCategory.TEEN, VisitMaterialCategory.TEEN]),
        {},
      ),
    ).rejects.toBeInstanceOf(RuleException);
    expect(repository.runInTransaction).not.toHaveBeenCalled();
  });

  it("mídias da própria página (material completo) vão para a página, só quando existem", async () => {
    await service.execute("page-1", dto([VisitMaterialCategory.ADULT]), {});
    expect(processor.processMediaItemsPolymorphic).not.toHaveBeenCalled();

    mediaService.toPolymorphicItems.mockReturnValue([{ title: "Completo" }]);
    await service.execute("page-1", dto([VisitMaterialCategory.TEEN]), {});
    expect(processor.processMediaItemsPolymorphic).toHaveBeenCalledWith(
      [{ title: "Completo" }],
      "page-1",
      MediaTargetType.VisitMaterialsPage,
      {},
      expect.any(Function),
      expect.any(Function),
    );
  });

  it("falha inesperada vira ProcessException; exceção HTTP já classificada passa como está", async () => {
    repository.runInTransaction.mockRejectedValueOnce(new Error("banco"));
    await expect(
      service.execute("page-1", dto([VisitMaterialCategory.CHILD]), {}),
    ).rejects.toBeInstanceOf(ProcessException);

    repository.runInTransaction.mockRejectedValueOnce(
      new RuleException("já classificada"),
    );
    await expect(
      service.execute("page-1", dto([VisitMaterialCategory.CHILD]), {}),
    ).rejects.toBeInstanceOf(RuleException);
  });
});
