import { Test } from "@nestjs/testing";
import { EntityManager } from "typeorm";
import { ProcessException, RuleException } from "src/common/exceptions";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { RouteService } from "src/infrastructure/route/services/route.service";
import { RouteType } from "src/infrastructure/route/route-page.entity";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { CreateVisitMaterialPageService } from "./create-visit-material-page.service";
import { VisitMaterialMediaService } from "./visit-material-media.service";
import { VisitMaterialsPageRepository } from "../repositories/visit-material-page.repository";
import { TestamentType } from "../enums/testament-type.enum";
import {
  VISIT_MATERIAL_ROUTE_CARD_IMAGE_URL,
  VISIT_MATERIAL_ROUTE_ENTITY_TYPE,
  VISIT_MATERIAL_ROUTE_PATH_PREFIX,
} from "../constants";
import {
  buildCreateDto,
  buildLinkMediaDto,
  buildMediaEntity,
  buildPageEntity,
  buildRouteEntity,
} from "../visit-material-page.fixtures";

describe("CreateVisitMaterialPageService", () => {
  const manager = {} as EntityManager;
  const repository = {
    create: jest.fn(),
    save: jest.fn(),
    runInTransaction: jest.fn(),
  };
  const mediaService = { toPolymorphicItems: jest.fn() };
  const mediaItemProcessor = { processMediaItemsPolymorphic: jest.fn() };
  const routeService = {
    generateAvailablePath: jest.fn(),
    createRouteWithManager: jest.fn(),
  };
  const s3 = { upload: jest.fn() };

  let service: CreateVisitMaterialPageService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateVisitMaterialPageService,
        { provide: VisitMaterialsPageRepository, useValue: repository },
        { provide: VisitMaterialMediaService, useValue: mediaService },
        { provide: MediaItemProcessor, useValue: mediaItemProcessor },
        { provide: RouteService, useValue: routeService },
        { provide: AwsS3Service, useValue: s3 },
      ],
    }).compile();

    service = moduleRef.get(CreateVisitMaterialPageService);

    repository.runInTransaction.mockImplementation(
      (work: (m: EntityManager) => Promise<unknown>) => work(manager),
    );
    repository.create.mockImplementation((partial: object) =>
      Object.assign(buildPageEntity(), partial),
    );
    repository.save.mockImplementation((page: unknown) =>
      Promise.resolve(page),
    );
    mediaService.toPolymorphicItems.mockReturnValue([]);
    mediaItemProcessor.processMediaItemsPolymorphic.mockResolvedValue([]);
    routeService.generateAvailablePath.mockResolvedValue(
      "materiais_visita_semana-1",
    );
    routeService.createRouteWithManager.mockResolvedValue(buildRouteEntity());
  });

  it("persists the page, its route and its media in one transaction", async () => {
    const result = await service.execute(buildCreateDto(), {});

    expect(repository.runInTransaction).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Materiais da visita",
        subtitle: "Subtítulo",
        description: "Descrição",
        testament: TestamentType.OLD_TESTAMENT,
      }),
      manager,
    );
    expect(result).toMatchObject({ id: "page-id", currentWeek: false });
  });

  it("generates the route with the documented prefix and metadata", async () => {
    await service.execute(buildCreateDto(), {});

    expect(routeService.generateAvailablePath).toHaveBeenCalledWith(
      "Materiais da visita",
      VISIT_MATERIAL_ROUTE_PATH_PREFIX,
    );
    expect(routeService.createRouteWithManager).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        path: "materiais_visita_semana-1",
        type: RouteType.PAGE,
        entityType: VISIT_MATERIAL_ROUTE_ENTITY_TYPE,
        image: VISIT_MATERIAL_ROUTE_CARD_IMAGE_URL,
        public: true,
        current: false,
      }),
    );
  });

  it("keeps the testament the payload asked for", async () => {
    await service.execute(
      buildCreateDto({ testament: TestamentType.NEW_TESTAMENT }),
      {},
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ testament: TestamentType.NEW_TESTAMENT }),
      manager,
    );
  });

  it("processes the media against the saved page", async () => {
    const dto = buildCreateDto({ videos: [buildLinkMediaDto()] });
    const items = [buildLinkMediaDto()];
    mediaService.toPolymorphicItems.mockReturnValue(items);
    mediaItemProcessor.processMediaItemsPolymorphic.mockResolvedValue([
      buildMediaEntity(),
    ]);

    const result = await service.execute(dto, {});

    expect(
      mediaItemProcessor.processMediaItemsPolymorphic,
    ).toHaveBeenCalledWith(
      items,
      "page-id",
      MediaTargetType.VisitMaterialsPage,
      {},
      expect.any(Function),
    );
    expect(result.videos).toHaveLength(1);
  });

  it("validates the media before opening the transaction", async () => {
    mediaService.toPolymorphicItems.mockImplementation(() => {
      throw new RuleException("fieldKey ausente");
    });

    await expect(service.execute(buildCreateDto(), {})).rejects.toBeInstanceOf(
      RuleException,
    );
    expect(repository.runInTransaction).not.toHaveBeenCalled();
  });

  it("rethrows an application error untouched instead of masking it", async () => {
    routeService.createRouteWithManager.mockRejectedValue(
      new RuleException("Caminho já utilizado"),
    );

    await expect(service.execute(buildCreateDto(), {})).rejects.toBeInstanceOf(
      RuleException,
    );
  });

  it("wraps an unexpected infrastructure failure as a process error", async () => {
    routeService.createRouteWithManager.mockRejectedValue(
      new Error("connection lost"),
    );

    await expect(service.execute(buildCreateDto(), {})).rejects.toBeInstanceOf(
      ProcessException,
    );
  });
});
