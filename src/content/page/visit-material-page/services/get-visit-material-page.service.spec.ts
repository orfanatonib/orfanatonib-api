import { VisitMaterialSectionsService } from "./visit-material-sections.service";
import { Test } from "@nestjs/testing";
import { HttpStatus } from "@nestjs/common";
import { ResourceNotFoundException } from "src/common/exceptions";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { GetVisitMaterialPageService } from "./get-visit-material-page.service";
import { VisitMaterialsPageRepository } from "../repositories/visit-material-page.repository";
import { TestamentType } from "../enums/testament-type.enum";
import {
  buildMediaEntity,
  buildPageEntity,
} from "../visit-material-page.fixtures";

describe("GetVisitMaterialPageService", () => {
  const repository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findCurrentWeek: jest.fn(),
  };
  const mediaItemProcessor = {
    findMediaItemsByTarget: jest.fn(),
    findManyMediaItemsByTargets: jest.fn(),
  };

  const sectionsService = {
    prepare: jest.fn().mockReturnValue([]),
    createAll: jest.fn().mockResolvedValue([]),
    sync: jest.fn().mockResolvedValue(undefined),
    loadForPage: jest.fn().mockResolvedValue([]),
    loadForPages: jest.fn().mockResolvedValue(new Map()),
    removeAllMedia: jest.fn().mockResolvedValue(undefined),
  };

  let service: GetVisitMaterialPageService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mediaItemProcessor.findMediaItemsByTarget.mockResolvedValue([]);
    mediaItemProcessor.findManyMediaItemsByTargets.mockResolvedValue([]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        GetVisitMaterialPageService,
        { provide: VisitMaterialsPageRepository, useValue: repository },
        { provide: VisitMaterialSectionsService, useValue: sectionsService },
        { provide: MediaItemProcessor, useValue: mediaItemProcessor },
      ],
    }).compile();

    service = moduleRef.get(GetVisitMaterialPageService);
  });

  describe("findAll", () => {
    it("forwards the query and maps every page", async () => {
      repository.findAll.mockResolvedValue([
        buildPageEntity({ id: "page-1" }),
        buildPageEntity({ id: "page-2" }),
      ]);

      const query = { testament: TestamentType.NEW_TESTAMENT };
      const result = await service.findAll(query);

      expect(repository.findAll).toHaveBeenCalledWith(query);
      expect(result.map((page) => page.id)).toEqual(["page-1", "page-2"]);
    });

    it("loads the media of every page in a single query and groups it", async () => {
      repository.findAll.mockResolvedValue([
        buildPageEntity({ id: "page-1" }),
        buildPageEntity({ id: "page-2" }),
      ]);
      mediaItemProcessor.findManyMediaItemsByTargets.mockResolvedValue([
        buildMediaEntity({ id: "m1", targetId: "page-1" }),
        buildMediaEntity({ id: "m2", targetId: "page-2" }),
        buildMediaEntity({ id: "m3", targetId: "page-1" }),
      ]);

      const result = await service.findAll();

      expect(
        mediaItemProcessor.findManyMediaItemsByTargets,
      ).toHaveBeenCalledTimes(1);
      expect(
        mediaItemProcessor.findManyMediaItemsByTargets,
      ).toHaveBeenCalledWith(
        ["page-1", "page-2"],
        MediaTargetType.VisitMaterialsPage,
      );
      expect(result[0].videos.map((item) => item.id)).toEqual(["m1", "m3"]);
      expect(result[1].videos.map((item) => item.id)).toEqual(["m2"]);
    });

    it("skips the media query entirely when there is no page", async () => {
      repository.findAll.mockResolvedValue([]);

      await expect(service.findAll()).resolves.toEqual([]);
      expect(
        mediaItemProcessor.findManyMediaItemsByTargets,
      ).not.toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("returns the page with its media", async () => {
      repository.findById.mockResolvedValue(buildPageEntity());
      mediaItemProcessor.findMediaItemsByTarget.mockResolvedValue([
        buildMediaEntity(),
      ]);

      const result = await service.findOne("page-id");

      expect(result.id).toBe("page-id");
      expect(result.videos).toHaveLength(1);
    });

    it("raises a 404 for an unknown page", async () => {
      repository.findById.mockResolvedValue(null);

      const error = await service
        .findOne("page-id")
        .catch((thrown: ResourceNotFoundException) => thrown);

      expect(error).toBeInstanceOf(ResourceNotFoundException);
      expect((error as ResourceNotFoundException).getStatus()).toBe(
        HttpStatus.NOT_FOUND,
      );
    });
  });

  describe("findCurrentWeek", () => {
    it("returns null when no page is flagged as current", async () => {
      repository.findCurrentWeek.mockResolvedValue(null);

      await expect(service.findCurrentWeek()).resolves.toBeNull();
    });

    it("returns the flagged page with its media", async () => {
      repository.findCurrentWeek.mockResolvedValue(
        buildPageEntity({ currentWeek: true }),
      );
      mediaItemProcessor.findMediaItemsByTarget.mockResolvedValue([
        buildMediaEntity(),
      ]);

      const result = await service.findCurrentWeek();

      expect(result).toMatchObject({ id: "page-id", currentWeek: true });
      expect(result?.videos).toHaveLength(1);
    });
  });
});
