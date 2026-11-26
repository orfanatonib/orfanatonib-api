import { Test } from "@nestjs/testing";
import { EntityManager } from "typeorm";
import {
  ProcessException,
  ResourceNotFoundException,
  RuleException,
} from "src/common/exceptions";
import { RouteService } from "src/infrastructure/route/services/route.service";
import { RouteType } from "src/infrastructure/route/route-page.entity";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { UpdateVisitMaterialPageService } from "./update-visit-material-page.service";
import { GetVisitMaterialPageService } from "./get-visit-material-page.service";
import { VisitMaterialMediaService } from "./visit-material-media.service";
import { VisitMaterialSectionsService } from "./visit-material-sections.service";
import { VisitMaterialsPageRepository } from "../repositories/visit-material-page.repository";
import { TestamentType } from "../enums/testament-type.enum";
import { VISIT_MATERIAL_ROUTE_ENTITY_TYPE } from "../constants";
import {
  buildLinkMediaDto,
  buildMediaEntity,
  buildPageEntity,
  buildRouteEntity,
  buildUpdateDto,
} from "../visit-material-page.fixtures";

describe("UpdateVisitMaterialPageService", () => {
  const manager = {} as EntityManager;
  const repository = {
    save: jest.fn(),
    runInTransaction: jest.fn(),
    lockPage: jest.fn(),
  };
  const getService = { findEntityOrFail: jest.fn() };
  const mediaService = {
    findAllByPage: jest.fn(),
    reconcile: jest.fn(),
  };
  const batch = { commit: jest.fn(), discard: jest.fn(), objects: [] };
  const mediaStorage = {
    newBatch: jest.fn(),
    deleteAfterCommit: jest.fn(),
  };
  const routeService = {
    findRouteByEntityId: jest.fn(),
    upsertRoute: jest.fn(),
  };

  const sectionsService = {
    prepare: jest.fn().mockReturnValue([]),
    createAll: jest.fn().mockResolvedValue([]),
    sync: jest.fn().mockResolvedValue(undefined),
    loadForPage: jest.fn().mockResolvedValue([]),
    loadForPages: jest.fn().mockResolvedValue(new Map()),
    removeAllMedia: jest.fn().mockResolvedValue(undefined),
  };

  let service: UpdateVisitMaterialPageService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateVisitMaterialPageService,
        { provide: VisitMaterialsPageRepository, useValue: repository },
        { provide: VisitMaterialSectionsService, useValue: sectionsService },
        { provide: GetVisitMaterialPageService, useValue: getService },
        { provide: VisitMaterialMediaService, useValue: mediaService },
        { provide: RouteService, useValue: routeService },
        { provide: MediaStorageService, useValue: mediaStorage },
      ],
    }).compile();

    service = moduleRef.get(UpdateVisitMaterialPageService);

    repository.runInTransaction.mockImplementation(
      (work: (m: EntityManager) => Promise<unknown>) => work(manager),
    );
    repository.save.mockImplementation((page: unknown) =>
      Promise.resolve(page),
    );
    getService.findEntityOrFail.mockResolvedValue(buildPageEntity());
    repository.lockPage.mockResolvedValue(true);
    mediaStorage.newBatch.mockReturnValue(batch);
    mediaStorage.deleteAfterCommit.mockResolvedValue(undefined);
    batch.discard.mockResolvedValue(undefined);
    mediaService.reconcile.mockResolvedValue(undefined);
    mediaService.findAllByPage.mockResolvedValue([]);
    routeService.findRouteByEntityId.mockResolvedValue(buildRouteEntity());
    routeService.upsertRoute.mockResolvedValue(buildRouteEntity());
  });

  it("applies the payload onto the page", async () => {
    const page = buildPageEntity();
    getService.findEntityOrFail.mockResolvedValue(page);

    await service.execute(
      "page-id",
      buildUpdateDto({
        pageTitle: "Novo título",
        pageSubtitle: "Novo subtítulo",
        pageDescription: "Nova descrição",
        currentWeek: true,
        testament: TestamentType.NEW_TESTAMENT,
      }),
      {},
    );

    expect(page.title).toBe("Novo título");
    expect(page.subtitle).toBe("Novo subtítulo");
    expect(page.description).toBe("Nova descrição");
    expect(page.currentWeek).toBe(true);
    expect(page.testament).toBe(TestamentType.NEW_TESTAMENT);
    expect(repository.save).toHaveBeenCalledWith(page, manager);
  });

  it("leaves the testament untouched when the payload omits it", async () => {
    const page = buildPageEntity({ testament: TestamentType.NEW_TESTAMENT });
    getService.findEntityOrFail.mockResolvedValue(page);

    await service.execute(
      "page-id",
      buildUpdateDto({ testament: undefined }),
      {},
    );

    expect(page.testament).toBe(TestamentType.NEW_TESTAMENT);
  });

  it("reconciles the four buckets inside the edit's write unit", async () => {
    const incomingVideo = buildLinkMediaDto({ id: "v-old" });
    const newAudio = buildLinkMediaDto({ id: undefined });

    await service.execute(
      "page-id",
      buildUpdateDto({ videos: [incomingVideo], audios: [newAudio] }),
      {},
    );

    expect(mediaService.reconcile).toHaveBeenCalledTimes(1);
    expect(mediaService.reconcile).toHaveBeenCalledWith(
      expect.objectContaining({ manager, batch }),
      "page-id",
      expect.objectContaining({
        videos: [incomingVideo],
        audios: [newAudio],
        documents: [],
        images: [],
      }),
      {},
    );
  });

  it("locks the page first, so simultaneous edits of the same page queue up", async () => {
    const order: string[] = [];
    repository.lockPage.mockImplementation(() => {
      order.push("lock");
      return Promise.resolve(true);
    });
    repository.save.mockImplementation((page: unknown) => {
      order.push("save");
      return Promise.resolve(page);
    });

    await service.execute("page-id", buildUpdateDto(), {});

    expect(order.slice(0, 2)).toEqual(["lock", "save"]);
  });

  it("raises a 404 when the page vanished before the lock, writing nothing", async () => {
    repository.lockPage.mockResolvedValue(false);

    await expect(
      service.execute("page-id", buildUpdateDto(), {}),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);

    expect(repository.save).not.toHaveBeenCalled();
    expect(mediaService.reconcile).not.toHaveBeenCalled();
    expect(batch.discard).toHaveBeenCalledTimes(1);
  });

  it("saves the page first, so a value the database refuses fails before any media or route changes", async () => {
    repository.save.mockRejectedValue(new Error("Data too long for column"));

    await expect(
      service.execute("page-id", buildUpdateDto(), {}),
    ).rejects.toBeInstanceOf(ProcessException);

    expect(mediaService.reconcile).not.toHaveBeenCalled();
    expect(routeService.upsertRoute).not.toHaveBeenCalled();
    expect(batch.discard).toHaveBeenCalledTimes(1);
    expect(mediaStorage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("[media-upload.legacy-update.visit-material#rollback-banco-falha] discards the staged uploads and keeps the old files when a later step fails", async () => {
    mediaService.reconcile.mockRejectedValue(new Error("falha na mídia"));

    await expect(
      service.execute("page-id", buildUpdateDto(), {}),
    ).rejects.toBeInstanceOf(ProcessException);

    expect(batch.discard).toHaveBeenCalledTimes(1);
    expect(batch.commit).not.toHaveBeenCalled();
    expect(mediaStorage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("[media-upload.legacy-update.visit-material#feliz] commits the batch and only then removes the files the edit made obsolete", async () => {
    mediaService.reconcile.mockImplementation(
      (unit: { obsoleteUrls: string[] }) => {
        unit.obsoleteUrls.push("https://bucket.test/antigo.pdf");
        return Promise.resolve();
      },
    );
    const order: string[] = [];
    batch.commit.mockImplementation(() => order.push("commit"));
    mediaStorage.deleteAfterCommit.mockImplementation(() => {
      order.push("delete");
      return Promise.resolve();
    });

    await service.execute("page-id", buildUpdateDto(), {});

    expect(order).toEqual(["commit", "delete"]);
    expect(mediaStorage.deleteAfterCommit).toHaveBeenCalledWith([
      "https://bucket.test/antigo.pdf",
    ]);
    expect(batch.discard).not.toHaveBeenCalled();
  });

  it("syncs the sections in the same write unit when the payload carries them", async () => {
    sectionsService.prepare.mockReturnValue([{ input: {}, mediaInputs: [] }]);

    await service.execute(
      "page-id",
      buildUpdateDto({ sections: [{ category: "BABY" }] as never }),
      {},
    );

    expect(sectionsService.sync).toHaveBeenCalledWith(
      "page-id",
      expect.anything(),
      {},
      expect.objectContaining({ manager, batch }),
    );
  });

  it("mirrors the page fields onto its route, preserving visibility", async () => {
    routeService.findRouteByEntityId.mockResolvedValue(
      buildRouteEntity({ public: false, current: true }),
    );

    await service.execute(
      "page-id",
      buildUpdateDto({ pageTitle: "Novo título" }),
      {},
    );

    expect(routeService.upsertRoute).toHaveBeenCalledWith(
      "route-id",
      expect.objectContaining({
        title: "Novo título",
        entityType: VISIT_MATERIAL_ROUTE_ENTITY_TYPE,
        type: RouteType.PAGE,
        public: false,
        current: true,
      }),
    );
  });

  it("raises a 404 when the page does not exist", async () => {
    getService.findEntityOrFail.mockRejectedValue(
      new ResourceNotFoundException("Página de materiais não encontrada."),
    );

    await expect(
      service.execute("page-id", buildUpdateDto(), {}),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("rejects a payload id that differs from the route before any write", async () => {
    await expect(
      service.execute("page-id", buildUpdateDto({ id: "another-page-id" }), {}),
    ).rejects.toBeInstanceOf(RuleException);

    expect(getService.findEntityOrFail).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("raises a 404 when the page has no route", async () => {
    routeService.findRouteByEntityId.mockResolvedValue(null);

    await expect(
      service.execute("page-id", buildUpdateDto(), {}),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("wraps an unexpected failure as a process error", async () => {
    repository.save.mockRejectedValue(new Error("connection lost"));

    await expect(
      service.execute("page-id", buildUpdateDto(), {}),
    ).rejects.toBeInstanceOf(ProcessException);
  });

  it("rethrows an application error untouched instead of masking it", async () => {
    mediaService.reconcile.mockRejectedValue(
      new ResourceNotFoundException("Mídia não encontrada."),
    );

    await expect(
      service.execute(
        "page-id",
        buildUpdateDto({ videos: [buildLinkMediaDto({ id: "v1" })] }),
        {},
      ),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  it("returns the page with its media reloaded", async () => {
    mediaService.findAllByPage.mockResolvedValue([buildMediaEntity()]);

    const result = await service.execute("page-id", buildUpdateDto(), {});

    expect(result.videos).toHaveLength(1);
  });
});
