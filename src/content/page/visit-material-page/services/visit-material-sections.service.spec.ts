import { Test } from "@nestjs/testing";
import { EntityManager } from "typeorm";

import { RuleException } from "src/common/exceptions";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { MediaType } from "src/shared/media/media-item/media-item.entity";

import { VisitMaterialSectionInputDto } from "../dto/visit-material-section.dto";
import { VisitMaterialSectionEntity } from "../entities/visit-material-section.entity";
import { VisitMaterialCategory } from "../enums/visit-material-category.enum";
import { VisitMaterialSectionRepository } from "../repositories/visit-material-section.repository";
import {
  buildLinkMediaDto,
  buildMediaEntity,
} from "../visit-material-page.fixtures";
import { VisitMaterialMediaService } from "./visit-material-media.service";
import { VisitMaterialSectionsService } from "./visit-material-sections.service";

const input = (
  category: VisitMaterialCategory,
  over: Partial<VisitMaterialSectionInputDto> = {},
) => Object.assign(new VisitMaterialSectionInputDto(), { category, ...over });

const stored = (id: string, category: VisitMaterialCategory) =>
  Object.assign(new VisitMaterialSectionEntity(), {
    id,
    pageId: "page-id",
    category,
    title: null,
    description: null,
    position: 0,
  });

describe("VisitMaterialSectionsService", () => {
  const manager = {} as EntityManager;
  const repository = {
    findByPageId: jest.fn(),
    findByPageIds: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const mediaService = {
    toPolymorphicItems: jest.fn(),
    findGroupedByPage: jest.fn(),
    findAllByPage: jest.fn(),
    removeMissing: jest.fn(),
    add: jest.fn(),
    upsert: jest.fn(),
  };
  const processor = {
    findManyMediaItemsByTargets: jest.fn(),
    processMediaItemsPolymorphic: jest.fn(),
    deleteMediaItems: jest.fn(),
  };
  const s3 = { upload: jest.fn(), delete: jest.fn() };
  let service: VisitMaterialSectionsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        VisitMaterialSectionsService,
        { provide: VisitMaterialSectionRepository, useValue: repository },
        { provide: VisitMaterialMediaService, useValue: mediaService },
        { provide: MediaItemProcessor, useValue: processor },
        { provide: AwsS3Service, useValue: s3 },
      ],
    }).compile();
    service = moduleRef.get(VisitMaterialSectionsService);

    repository.create.mockImplementation((partial: object) =>
      Object.assign(new VisitMaterialSectionEntity(), partial, {
        id: "new-id",
      }),
    );
    repository.save.mockImplementation((section: unknown) =>
      Promise.resolve(section),
    );
    mediaService.toPolymorphicItems.mockReturnValue([]);
    mediaService.findGroupedByPage.mockResolvedValue(new Map());
    mediaService.findAllByPage.mockResolvedValue([]);
    processor.processMediaItemsPolymorphic.mockResolvedValue([]);
  });

  describe("prepare", () => {
    it("rejects the same category twice before touching anything", () => {
      expect(() =>
        service.prepare(
          [
            input(VisitMaterialCategory.BABY),
            input(VisitMaterialCategory.BABY),
          ],
          {},
        ),
      ).toThrow(RuleException);
      expect(mediaService.toPolymorphicItems).not.toHaveBeenCalled();
    });

    it("validates the media of every section", () => {
      service.prepare(
        [input(VisitMaterialCategory.BABY), input(VisitMaterialCategory.TEEN)],
        {},
      );
      expect(mediaService.toPolymorphicItems).toHaveBeenCalledTimes(2);
    });
  });

  describe("createAll", () => {
    it("stores each section with its media under the section target", async () => {
      const prepared = service.prepare(
        [input(VisitMaterialCategory.TEEN, { title: "  Teens  " })],
        {},
      );
      processor.processMediaItemsPolymorphic.mockResolvedValue([
        buildMediaEntity(),
      ]);

      const [created] = await service.createAll(
        "page-id",
        prepared,
        {},
        manager,
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pageId: "page-id",
          category: VisitMaterialCategory.TEEN,
          title: "Teens",
          position: 2,
        }),
        manager,
      );
      expect(processor.processMediaItemsPolymorphic).toHaveBeenCalledWith(
        [],
        "new-id",
        MediaTargetType.VisitMaterialsSection,
        {},
        expect.any(Function),
        expect.any(Function),
      );
      expect(created.media).toHaveLength(1);
    });
  });

  describe("sync", () => {
    it("creates new categories, updates kept ones and removes the dropped ones", async () => {
      repository.findByPageId.mockResolvedValue([
        stored("s-baby", VisitMaterialCategory.BABY),
        stored("s-child", VisitMaterialCategory.CHILD),
      ]);
      mediaService.findAllByPage.mockResolvedValue([
        buildMediaEntity({ id: "old", mediaType: MediaType.DOCUMENT }),
      ]);
      const prepared = service.prepare(
        [
          input(VisitMaterialCategory.BABY, {
            description: "novo texto",
            documents: [buildLinkMediaDto()],
          }),
          input(VisitMaterialCategory.ADULT),
        ],
        {},
      );

      await service.sync("page-id", prepared, {});

      // CHILD saiu: mídias e linha removidas
      expect(processor.deleteMediaItems).toHaveBeenCalledTimes(1);
      expect(repository.remove).toHaveBeenCalledWith(
        expect.objectContaining({ id: "s-child" }),
      );
      // BABY continuou: atualizada e mídia nova gravada no alvo da seção
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: "s-baby", description: "novo texto" }),
      );
      expect(mediaService.add).toHaveBeenCalledWith(
        expect.anything(),
        "s-baby",
        MediaType.DOCUMENT,
        {},
        MediaTargetType.VisitMaterialsSection,
      );
      // ADULT é nova
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: VisitMaterialCategory.ADULT }),
        undefined,
      );
    });
  });

  describe("loadForPages", () => {
    it("groups the sections and their media by page in two queries", async () => {
      repository.findByPageIds.mockResolvedValue([
        stored("s1", VisitMaterialCategory.BABY),
        stored("s2", VisitMaterialCategory.TEEN),
      ]);
      processor.findManyMediaItemsByTargets.mockResolvedValue([
        buildMediaEntity({ id: "m1", targetId: "s2" }),
      ]);

      const result = await service.loadForPages(["page-id"]);

      expect(processor.findManyMediaItemsByTargets).toHaveBeenCalledWith(
        ["s1", "s2"],
        MediaTargetType.VisitMaterialsSection,
      );
      expect(result.get("page-id")?.map((item) => item.media.length)).toEqual([
        0, 1,
      ]);
    });

    it("skips the media query when no page has sections", async () => {
      repository.findByPageIds.mockResolvedValue([]);
      expect((await service.loadForPages(["page-id"])).size).toBe(0);
      expect(processor.findManyMediaItemsByTargets).not.toHaveBeenCalled();
    });
  });
});
