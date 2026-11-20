import { Test } from "@nestjs/testing";
import { EntityManager } from "typeorm";
import {
  ProcessException,
  ResourceNotFoundException,
  RuleException,
} from "src/common/exceptions";
import { RouteService } from "src/infrastructure/route/services/route.service";
import { RouteType } from "src/infrastructure/route/route-page.entity";
import { MediaType } from "src/shared/media/media-item/media-item.entity";
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
  const repository = { save: jest.fn(), runInTransaction: jest.fn() };
  const getService = { findEntityOrFail: jest.fn() };
  const mediaService = {
    findGroupedByPage: jest.fn(),
    findAllByPage: jest.fn(),
    removeMissing: jest.fn(),
    add: jest.fn(),
    upsert: jest.fn(),
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

  const emptyGroups = () =>
    new Map([
      [MediaType.VIDEO, []],
      [MediaType.DOCUMENT, []],
      [MediaType.IMAGE, []],
      [MediaType.AUDIO, []],
    ]);

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
    mediaService.findGroupedByPage.mockResolvedValue(emptyGroups());
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

  it("reconciles the four buckets against what is stored", async () => {
    const storedVideo = buildMediaEntity({
      id: "v-old",
      mediaType: MediaType.VIDEO,
    });
    mediaService.findGroupedByPage.mockResolvedValue(
      new Map([
        [MediaType.VIDEO, [storedVideo]],
        [MediaType.DOCUMENT, []],
        [MediaType.IMAGE, []],
        [MediaType.AUDIO, []],
      ]),
    );

    const incomingVideo = buildLinkMediaDto({ id: "v-old" });
    const newAudio = buildLinkMediaDto({ id: undefined });

    await service.execute(
      "page-id",
      buildUpdateDto({ videos: [incomingVideo], audios: [newAudio] }),
      {},
    );

    expect(mediaService.removeMissing).toHaveBeenCalledTimes(4);
    expect(mediaService.removeMissing).toHaveBeenCalledWith(
      [storedVideo],
      [incomingVideo],
    );
    // Item com id é atualizado; sem id é criado.
    expect(mediaService.upsert).toHaveBeenCalledWith(
      incomingVideo,
      "page-id",
      MediaType.VIDEO,
      {},
    );
    expect(mediaService.add).toHaveBeenCalledWith(
      newAudio,
      "page-id",
      MediaType.AUDIO,
      {},
    );
  });

  it("reads the stored media only once for the four buckets", async () => {
    await service.execute("page-id", buildUpdateDto(), {});

    expect(mediaService.findGroupedByPage).toHaveBeenCalledTimes(1);
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

  it("treats an absent bucket as empty when reconciling", async () => {
    // O mapa de armazenados pode não trazer um tipo; a rotina não pode quebrar.
    mediaService.findGroupedByPage.mockResolvedValue(new Map());

    await service.execute("page-id", buildUpdateDto(), {});

    expect(mediaService.removeMissing).toHaveBeenCalledWith([], []);
  });

  it("rethrows an application error untouched instead of masking it", async () => {
    mediaService.upsert.mockRejectedValue(
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
